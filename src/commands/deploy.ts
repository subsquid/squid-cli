import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'util';

import { Args, Flags, ux as CliUx } from '@oclif/core';
import { ManifestValue } from '@subsquid/manifest';
import chalk from 'chalk';
import { globSync } from 'glob';
import ignore from 'ignore';
import inquirer from 'inquirer';
import prettyBytes from 'pretty-bytes';
import targz from 'targz';

import { deploySquid, uploadFile } from '../api';
import { DeployCommand } from '../deploy-command';
import { loadManifestFile } from '../manifest';

const compressAsync = promisify(targz.compress);

const SQUID_PATH_DESC = [
  `Squid source. Could be:`,
  `  - a relative or absolute path to a local folder (e.g. ".")`,
  `  - a URL to a .tar.gz archive`,
  `  - a github URL to a git repo with a branch or commit tag`,
];

const PACKAGE_JSON = 'package.json';

const lockFiles = {
  npm: 'package-lock.json',
  yarn: 'yarn.lock',
  pnpm: 'pnpm-lock.yaml',
};

export function resolveManifest(
  localPath: string,
  manifestPath: string,
): { error: string } | { buildDir: string; squidDir: string; manifest: ManifestValue } {
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

  static args = {
    source: Args.string({
      description: SQUID_PATH_DESC.join('\n'),
      required: true,
      default: '.',
    }),
  };

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

    const orgCode = await this.promptOrganization(org, 'using "-o" flag');

    if (!isUrl) {
      this.log(`🦑 Releasing the squid from local folder`);

      const res = resolveManifest(source, manifestPath);
      if ('error' in res) return this.showError(res.error, 'MANIFEST_VALIDATION_FAILED');

      const { buildDir, squidDir, manifest } = res;

      this.log(chalk.dim(`Squid directory: ${squidDir}`));
      this.log(chalk.dim(`Build directory: ${buildDir}`));
      this.log(chalk.dim(`Manifest: ${manifestPath}`));

      const squid = await this.findSquid({ orgCode, squidName: manifest.name });
      if (squid) {
        const version = squid.versions.find((v) => v.name === `v${manifest.version}`);

        if (version) {
          /**
           * Version exists we should check running deploys
           */
          const attached = await this.attachToParallelDeploy(squid, version);
          if (attached) return;
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
      }

      const archiveName = `${manifest.name}-v${manifest.version}.tar.gz`;

      const actifactPath = await this.pack({ buildDir, squidDir, archiveName });
      const artifactUrl = await this.upload({ orgCode, actifactPath });

      deploy = await deploySquid({
        orgCode,
        data: {
          hardReset,
          artifactUrl,
          manifestPath,
        },
      });
    } else {
      this.log(`🦑 Releasing the squid from remote`);

      deploy = await deploySquid({
        orgCode,
        data: {
          hardReset,
          artifactUrl: source,
          manifestPath,
        },
      });
    }
    if (!deploy) return;

    await this.pollDeploy({ orgCode, deployId: deploy.id, streamLogs: !disableStreamLogs });

    this.log('✔️ Done!');
  }

  private async pack({ buildDir, squidDir, archiveName }: { buildDir: string; squidDir: string; archiveName: string }) {
    CliUx.ux.action.start(`◷ Compressing the squid to ${archiveName} `);

    const squidIgnore = createSquidIgnore(squidDir);

    if (!hasPackageJson(squidDir) || squidIgnore?.ignores(PACKAGE_JSON)) {
      return this.showError(
        [
          `The ${PACKAGE_JSON} file was not found in the squid directory`,
          ``,
          `Squid directory: ${squidDir}`,
          ``,
          `Please provide a path to the root of a squid directory`,
          ``,
        ].join('\n'),
        'PACKING_FAILED',
      );
    }

    // const lockFile = get(lockFiles, manifest.build.package_manager);
    // if (!hasLockFile(squidDir, lockFile)) {
    //   return this.error(
    //     [
    //       `${lockFile || 'Lockfile'} is not found in the squid directory`,
    //       ``,
    //       `Squid directory    ${squidDir}`,
    //       ``,
    //       `Please provide a path to the root of a squid directory`,
    //       ``,
    //     ].join('\n'),
    //   );
    // }

    const squidArtifact = path.join(buildDir, archiveName);

    let filesCount = 0;
    await compressAsync({
      src: squidDir,
      dest: squidArtifact,
      tar: {
        ignore: (name) => {
          const relativePath = path.relative(path.resolve(squidDir), path.resolve(name));

          if (squidIgnore.ignores(relativePath)) {
            this.log(chalk.dim(`-- ignoring ${relativePath}`));
            return true;
          } else {
            this.log(chalk.dim(`adding ${relativePath}`));
            filesCount++;
            return false;
          }
        },
      },
    });

    if (filesCount === 0) {
      return this.showError(
        `0 files were found in ${squidDir}. Please check the squid source, looks like it is empty`,
        'PACKING_FAILED',
      );
    }

    const squidArtifactStats = fs.statSync(squidArtifact);

    CliUx.ux.action.stop(`${filesCount} files, ${prettyBytes(squidArtifactStats.size)} ✔️`);

    return squidArtifact;
  }

  private async upload({ orgCode, actifactPath }: { orgCode: string; actifactPath: string }) {
    CliUx.ux.action.start(`◷ Uploading ${path.basename(actifactPath)}`);

    const { error, fileUrl: artifactUrl } = await uploadFile(orgCode, actifactPath);
    if (error) {
      return this.showError(error);
    } else if (!artifactUrl) {
      return this.showError('The artifact URL is missing', 'UPLOAD_FAILED');
    }

    CliUx.ux.action.stop('✔️');

    return artifactUrl;
  }
}

function hasPackageJson(squidDir: string) {
  return fs.existsSync(path.join(squidDir, PACKAGE_JSON));
}

function hasLockFile(squidDir: string, lockFile?: string) {
  if (lockFile) {
    return fs.existsSync(path.join(squidDir, lockFile));
  } else {
    return Object.values(lockFiles).some((lf) => fs.existsSync(path.join(squidDir, lf)));
  }
}

export function createSquidIgnore(squidDir: string) {
  const ig = ignore().add(
    // default ignore patterns
    ['node_modules', '.git'],
  );

  const ignoreFilePaths = globSync(['.squidignore', '**/.squidignore'], {
    cwd: squidDir,
    nodir: true,
    posix: true,
  });

  if (!ignoreFilePaths.length) {
    return ig.add([
      // squid uploaded archives directory
      '/builds',
      // squid built files
      '/lib',
      // IDE files
      '.idea',
      '.vscode',
    ]);
  }

  for (const ignoreFilePath of ignoreFilePaths) {
    const ignoreDir = path.dirname(ignoreFilePath);

    const raw = fs.readFileSync(ignoreFilePath).toString();
    const patterns = getIgnorePatterns(ignoreDir, raw);

    ig.add(patterns);
  }

  return ig;
}

export function getIgnorePatterns(ignoreDir: string, raw: string) {
  const lines = raw.split('\n');

  const patterns: string[] = [];
  for (let line of lines) {
    line = line.trim();

    if (line.length === 0) continue;
    if (line.startsWith('#')) continue;

    let pattern = line.startsWith('/') || line.startsWith('*/') || line.startsWith('**/') ? line : `**/${line}`;
    pattern = ignoreDir === '.' ? pattern : `${toRootPattern(ignoreDir)}${toRootPattern(pattern)}`;

    patterns.push(pattern);
  }

  return patterns;
}

function toRootPattern(pattern: string) {
  return pattern.startsWith('/') ? pattern : `/${pattern}`;
}
