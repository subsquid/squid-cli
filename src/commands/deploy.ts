import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import { CliUx, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import targz from 'targz';

import { deploySquid, uploadFile } from '../api';
import { DeployCommand } from '../deploy-command';
import { Manifest } from '../manifest';
import { loadManifestFile } from '../manifest/loadManifestFile';

const compressAsync = promisify(targz.compress);

const SQUID_PATH_DESC = [
  `Squid source. Could be:`,
  `  - a relative or absolute path to a local folder (e.g. ".")`,
  `  - a URL to a .tar.gz archive`,
  `  - a github URL to a git repo with a branch or commit tag`,
];

export function resolveManifest(
  localPath: string,
  manifestPath: string,
): { error: string } | { buildDir: string; squidDir: string; manifest: Manifest } {
  try {
    const { squidDir, manifest } = loadManifestFile(localPath, manifestPath);

    const buildDir = path.join(squidDir, 'builds');
    fs.mkdirSync(buildDir, { recursive: true, mode: 0o777 });

    return {
      squidDir,
      buildDir,
      manifest,
    };
  } catch (e: any) {
    return { error: e.message };
  }
}

export default class Deploy extends DeployCommand {
  static description = 'Deploy new or update an existing squid in the Cloud';
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
      description: 'Relative local path to a squid manifest file in squid source',
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
    org: Flags.string({
      char: 'o',
      description: 'Organization',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { source },
      flags: { manifest: manifestPath, 'hard-reset': hardReset, update, 'no-stream-logs': disableStreamLogs, org },
    } = await this.parse(Deploy);

    const isUrl = source.startsWith('http://') || source.startsWith('https://');
    let deploy;

    let organization = org;

    if (!isUrl) {
      const res = resolveManifest(source, manifestPath);
      if ('error' in res) return this.error(res.error);

      const { buildDir, squidDir, manifest } = res;

      const archiveName = `${manifest.name}-v${manifest.version}.tar.gz`;
      const squidArtifact = path.join(buildDir, archiveName);

      this.log(chalk.dim(`Squid directory: ${squidDir}`));
      this.log(chalk.dim(`Build directory: ${buildDir}`));
      this.log(chalk.dim(`Manifest: ${manifestPath}`));

      const squid = await this.findSquid({ squidName: manifest.name });
      if (squid) {
        const version = squid.versions.find((v) => v.name === `v${manifest.version}`);

        if (version) {
          /**
           * Version exists we should check running deploys
           */
          const attached = await this.attachToParallelDeploy(squid, version);
          if (attached) return;
        }

        if (squid.organization?.code) {
          if (organization && organization !== squid.organization.code) {
            const { confirm } = await inquirer.prompt([
              {
                name: 'confirm',
                type: 'confirm',
                message: `Version "v${manifest.version}" of Squid "${manifest.name}" belongs to "${squid.organization?.code}". Update a squid in "${squid.organization?.code}" project?`,
              },
            ]);
            if (!confirm) return;
          }

          organization = squid.organization.code;
        }

        if (version && !update) {
          const { confirm } = await inquirer.prompt([
            {
              name: 'confirm',
              type: 'confirm',
              message: `Version "v${manifest.version}" of Squid "${manifest.name}" will be updated. Are you sure?`,
            },
          ]);
          if (!confirm) return;
        }
      } else {
        /**
         * It is a new squid need to check project code is specified
         */
        organization = await this.promptOrganization(organization, 'using "-o" flag');
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
      if (error) return this.error(error);
      else if (!artifactUrl) return this.error('The artifact URL is missing');

      this.log(`🦑 Releasing the squid from local folder`);

      deploy = await deploySquid({
        hardReset,
        artifactUrl,
        manifestPath,
        organization,
      });
    } else {
      organization = await this.promptOrganization(organization, 'using "-o" flag');
      this.log(`🦑 Releasing the squid from remote`);

      deploy = await deploySquid({
        hardReset,
        artifactUrl: source,
        manifestPath,
        organization,
      });
    }

    if (!deploy) {
      return;
    }

    await this.pollDeploy({ deployId: deploy.id, streamLogs: !disableStreamLogs });

    this.log('✔️ Done!');
  }
}
