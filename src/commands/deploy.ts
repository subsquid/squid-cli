import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import { CliUx, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import targz from 'targz';

import {
  DeployResponse,
  deploySquid,
  DeployStatus,
  getDeploy,
  isVersionExists,
  streamSquidLogs,
  uploadFile,
} from '../api';
import { CliCommand } from '../command';
import { Manifest } from '../manifest';
import { doUntil } from '../utils';

const compressAsync = promisify(targz.compress);

const SQUID_PATH_DESC = [
  `Squid source. Could be:`,
  `  - a relative or absolute path to a local folder (e.g. ".")`,
  `  - a URL to a .tar.gz archive`,
  `  - a github URL to a git repo with a branch or commit tag`,
];

export function resolveManifest(
  localPath: string,
  manifest: string,
): { error: string } | { buildDir: string; squidDir: string; manifestValue: Manifest } {
  const manifestPath = path.resolve(path.join(localPath, manifest));
  if (fs.statSync(manifestPath).isDirectory()) {
    return {
      error: `The path ${manifestPath} is a directory, not a manifest file. Please provide a path to a valid manifest file`,
    };
  }

  const squidDir = path.dirname(manifestPath);
  const buildDir = path.join(squidDir, 'builds');

  fs.mkdirSync(buildDir, { recursive: true, mode: 0o777 });

  try {
    const manifestValue = yaml.load(fs.readFileSync(manifestPath).toString()) as Manifest;

    if (!manifestValue.name) {
      return { error: `A Squid  ${chalk.bold('name')} must be specified in the manifest` };
    } else if (manifestValue.version < 1) {
      return { error: `A Squid ${chalk.bold('version')} must be greater than 0` };
    } else if (!manifestValue.version) {
      return { error: `A Squid ${chalk.bold('version')} must be specified in the manifest` };
    }

    return {
      squidDir,
      buildDir,
      manifestValue,
    };
  } catch (e: any) {
    return { error: `The manifest file on ${manifestPath} can not be parsed: ${e.message}` };
  }
}

export default class Deploy extends CliCommand {
  static aliases = ['squid:deploy'];

  static description = 'Deploy a new squid version';
  static args = [
    {
      name: 'source',
      description: SQUID_PATH_DESC.join('\n'),
      required: true,
    },
  ];
  static flags = {
    manifest: Flags.string({
      char: 'm',
      description: 'A manifest file',
      required: false,
      default: 'squid.yaml',
    }),
    update: Flags.boolean({
      char: 'u',
      description: 'Do not require a confirmation if the version already exists',
      required: false,
    }),
    'hard-reset': Flags.boolean({
      char: 'r',
      description:
        'Do a hard reset before deploying. Drops and re-creates all the squid resources including the database. Will cause a short API downtime',
      required: false,
    }),
    'no-stream-logs': Flags.boolean({
      description: 'Do not attach and stream squid logs after the deploy',
      required: false,
      default: false,
    }),
  };

  deploy: DeployResponse | undefined;
  logsPrinted = 0;

  async run(): Promise<void> {
    const {
      args: { source },
      flags: { manifest, 'hard-reset': hardReset, update, 'no-stream-logs': disableStreamLogs },
    } = await this.parse(Deploy);

    const isUrl = source.startsWith('http://') || source.startsWith('https://');
    let deploy;
    if (!isUrl) {
      const res = resolveManifest(source, manifest);
      if ('error' in res) return this.error(res.error);

      const { buildDir, squidDir, manifestValue } = res;

      const archiveName = `${manifestValue.name}-v${manifestValue.version}.tar.gz`;
      const squidArtifact = path.join(buildDir, archiveName);

      this.log(chalk.dim(`Squid directory: ${squidDir}`));
      this.log(chalk.dim(`Build directory: ${buildDir}`));
      this.log(chalk.dim(`Manifest: ${manifest}`));

      const foundVersion = await isVersionExists(manifestValue.name, `v${manifestValue.version}`);
      if (foundVersion && !update) {
        const { confirm } = await inquirer.prompt([
          {
            name: 'confirm',
            type: 'confirm',
            message: `Version "v${manifestValue.version}" of Squid "${manifestValue.name}" will be updated. Are you sure?`,
          },
        ]);
        if (!confirm) return;
      }

      CliUx.ux.action.start(`◷ Compressing the squid to ${archiveName} `);
      let filesCount = 0;
      await compressAsync({
        src: squidDir,
        dest: squidArtifact,
        tar: {
          ignore: (name) => {
            const relativePath = path.relative(path.resolve(squidDir), path.resolve(name));

            switch (relativePath) {
              case 'node_modules':
              case 'builds':
              case 'lib':
              // FIXME: .env ?
              case '.git':
              case '.github':
              case '.idea':
                this.log(chalk.dim(`-- ignoring ${relativePath}`));
                return true;
              default:
                this.log(chalk.dim(`adding ${relativePath}`));

                filesCount++;
                return false;
            }
          },
        },
      });
      CliUx.ux.action.stop(`${filesCount} file(s) ✔️`);
      if (filesCount === 0) {
        return this.error(`0 files were found in ${squidDir}. Please check the squid source, looks like it is empty`);
      }

      CliUx.ux.action.start(`◷ Uploading ${path.basename(squidArtifact)}`);
      const { error, fileUrl: artifactUrl } = await uploadFile(squidArtifact);
      if (error) {
        return this.error(error);
      } else if (!artifactUrl) {
        return this.error('The artifact URL is missing');
      }

      this.log(`🦑 Releasing the squid`);

      deploy = await deploySquid({
        hardReset,
        artifactUrl,
        manifestPath: manifest,
      });
    } else {
      this.log(`🦑 Releasing the squid`);

      deploy = await deploySquid({
        hardReset,
        artifactUrl: source,
        manifestPath: manifest,
      });
    }

    if (!deploy) {
      return;
    }

    this.log(
      '◷ You may now detach from the build process by pressing Ctrl + C. The Squid deployment will continue uninterrupted.',
    );
    this.log('◷ The new squid will be available as soon as the deployment is complete.');
    await this.pollDeploy(deploy, { streamLogs: !disableStreamLogs });
    this.log('✔️ Done!');
  }

  async pollDeploy(deploy: DeployResponse, { streamLogs }: { streamLogs: boolean }): Promise<void> {
    let lastStatus: string;

    await doUntil(
      async () => {
        this.deploy = await getDeploy(deploy.id);

        if (!this.deploy) return true;
        if (this.deploy.status !== lastStatus) {
          lastStatus = this.deploy.status;
          CliUx.ux.action.stop('✔️');
        }

        this.printDebug();

        switch (this.deploy.status) {
          case DeployStatus.UNPACKING:
            CliUx.ux.action.start('◷ Preparing the squid');
            if (this.deploy.failed) return this.showError(`❌ An error occurred while unpacking the squid`);

            return false;
          case DeployStatus.RESETTING:
            CliUx.ux.action.start('◷ Resetting the squid');
            if (this.deploy.failed) return this.showError(`❌ An error occurred while resetting the squid`);

            return false;
          case DeployStatus.IMAGE_BUILDING:
            CliUx.ux.action.start('◷ Building the squid');
            if (this.deploy.failed) return this.showError(`❌ An error occurred while building the squid`);

            return false;
          case DeployStatus.IMAGE_PUSHING:
            CliUx.ux.action.start('◷ Pushing the image');
            if (this.deploy.failed) return this.showError(`❌ An error occurred while publishing the squid`);

            return false;
          case DeployStatus.DEPLOYING:
            CliUx.ux.action.start('◷ Deploying the squid');
            if (this.deploy.failed) return this.showError(`❌ An error occurred while deploying the squid`);

            return false;
          case DeployStatus.OK:
            this.log(`The squid is up and running. The GraphQL API will be shortly available at ${this.deploy.deploymentUrl}`);

            if (streamLogs && this.deploy.squidName && this.deploy.versionName) {
              CliUx.ux.action.start(`Streaming logs from the squid`);
              await streamSquidLogs(this.deploy.squidName, this.deploy.versionName, (l) => this.log(l));
            }

            return true;
          default:
            /**
             * Just wait if some unexpected status has been received.
             * This behavior is more safe for forward compatibility
             */
            return false;
        }
      },
      { pause: 3000 },
    );
  }
  printDebug = () => {
    if (!this.deploy) return;

    const logs = this.deploy.logs.slice(this.logsPrinted);
    if (logs.length === 0) return;

    this.logsPrinted += logs.length;

    logs
      .filter((v) => v)
      .forEach(({ severity, message }) => {
        switch (severity) {
          case 'info':
            this.log(chalk.cyan(message));
            return;
          case 'warn':
            this.log(chalk.yellow(message));
            return;
          case 'error':
            this.log(chalk.red(message));
            return;
          default:
            this.log(chalk.dim(message));
        }
      });
  };

  showError(text: string): boolean {
    CliUx.ux.action.stop('');
    // FIXME: maybe we should send an error report ourselves here with more details?
    this.error(
      [
        text,
        `------`,
        'Please report to Discord https://discord.gg/KRvRcBdhEE or SquidDevs https://t.me/HydraDevs',
        `${chalk.dim('Deploy:')} ${this.deploy?.id}`,
        this.deploy?.squidName ? `${chalk.dim('Squid:')} ${this.deploy?.squidName}` : null,
        this.deploy?.versionName ? `${chalk.dim('Version:')} ${this.deploy?.versionName}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    );

    return true;
  }
}
