import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import { CliUx, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import targz from 'targz';

import { deploySquid, uploadFile, chooseProjectIfRequired } from '../api';
import { DeployCommand } from '../deploy-command';
import { Manifest } from '../manifest';

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
  const squidDir = path.resolve(localPath);
  if (!fs.statSync(squidDir).isDirectory()) {
    return {
      error: `The path ${squidDir} is a not a squid directory. Please provide a path to a squid root directory`,
    };
  }

  const manifestPath = path.resolve(path.join(localPath, manifest));
  if (fs.statSync(manifestPath).isDirectory()) {
    return {
      error: `The path ${manifestPath} is a directory, not a manifest file. Please provide a path to a valid manifest file inside squid directory`,
    };
  }

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

export default class Deploy extends DeployCommand {
  static aliases = ['squid:deploy'];

  static description = 'Deploy a new or update an existing squid version';
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
      description: 'Relative path to a squid manifest file in squid source',
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
    project: Flags.string({
      char: 'p',
      description: 'Project',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { source },
      flags: { manifest, 'hard-reset': hardReset, update, 'no-stream-logs': disableStreamLogs, project },
    } = await this.parse(Deploy);

    const isUrl = source.startsWith('http://') || source.startsWith('https://');
    let deploy;

    let projectCode = project;

    if (!isUrl) {
      const res = resolveManifest(source, manifest);
      if ('error' in res) return this.error(res.error);

      const { buildDir, squidDir, manifestValue } = res;

      const archiveName = `${manifestValue.name}-v${manifestValue.version}.tar.gz`;
      const squidArtifact = path.join(buildDir, archiveName);

      this.log(chalk.dim(`Squid directory: ${squidDir}`));
      this.log(chalk.dim(`Build directory: ${buildDir}`));
      this.log(chalk.dim(`Manifest: ${manifest}`));

      const squid = await this.findSquid({ squidName: manifestValue.name });
      if (squid) {
        const version = squid.versions.find((v) => v.name === `v${manifestValue.version}`);

        if (version) {
          /**
           * Version exists we should check running deploys
           */
          const attached = await this.attachToParallelDeploy(squid, version);
          if (attached) return;
        }

        if (squid.project?.code) {
          if (projectCode && projectCode !== squid.project.code) {
            const { confirm } = await inquirer.prompt([
              {
                name: 'confirm',
                type: 'confirm',
                message: `Version "v${manifestValue.version}" of Squid "${manifestValue.name}" belongs to "${squid.project?.code}". Update a squid in "${squid.project?.code}" project?`,
              },
            ]);
            if (!confirm) return;
          }

          projectCode = squid.project.code;
        }

        if (version && !update) {
          const { confirm } = await inquirer.prompt([
            {
              name: 'confirm',
              type: 'confirm',
              message: `Version "v${manifestValue.version}" of Squid "${manifestValue.name}" will be updated. Are you sure?`,
            },
          ]);
          if (!confirm) return;
        }
      } else {
        /**
         * It is a new squid need to check project code is specified
         */
        projectCode = await chooseProjectIfRequired(projectCode);
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
              case 'Dockerfile':
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

      this.log(`🦑 Releasing the squid from local folder`);

      deploy = await deploySquid({
        hardReset,
        artifactUrl,
        manifestPath: manifest,
        project: projectCode,
      });
    } else {
      this.log(`🦑 Releasing the squid from remote`);

      deploy = await deploySquid({
        hardReset,
        artifactUrl: source,
        manifestPath: manifest,
        project: await chooseProjectIfRequired(projectCode),
      });
    }

    if (!deploy) {
      return;
    }

    await this.pollDeploy({ deployId: deploy.id, streamLogs: !disableStreamLogs });

    this.log('✔️ Done!');
  }
}
