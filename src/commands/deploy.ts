import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'util';

import { Args, Flags, ux as CliUx } from '@oclif/core';
import { Manifest } from '@subsquid/manifest';
import chalk from 'chalk';
import diff from 'cli-diff';
import { globSync } from 'glob';
import ignore from 'ignore';
import inquirer from 'inquirer';
import prettyBytes from 'pretty-bytes';
import targz from 'targz';

import { deploySquid, OrganizationRequest, uploadFile } from '../api';
import { SUCCESS_CHECK_MARK } from '../command';
import { DeployCommand } from '../deploy-command';
import { loadManifestFile } from '../manifest';
import { formatSquidName, parseSquidReference, SQUID_HASH_SYMBOL, SQUID_TAG_SYMBOL } from '../utils';

const compressAsync = promisify(targz.compress);

const SQUID_WORKDIR_DESC = [
  `Squid working directory. Could be:`,
  `  - a relative or absolute path to a local folder (e.g. ".")`,
  `  - a URL to a .tar.gz archive`,
  `  - a github URL to a git repo with a branch or commit tag`,
];

export const UPDATE_COLOR = 'cyan';
export const CREATE_COLOR = 'green';
export const DELETE_COLOR = 'red';

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

function example(command: string, description: string) {
  // return [chalk.dim(`// ${description}`), command].join('\r\n');
  return `${command} ${chalk.dim(`// ${description}`)}`;
}

export default class Deploy extends DeployCommand {
  static description = 'Deploy new or update an existing squid in the Cloud';
  static examples = [
    example('sqd deploy', 'Create a new squid with name provided in the manifest file'),
    example(
      'sqd deploy my-squid-override',
      'Create a new squid deployment and override it\'s name to "my-squid-override"',
    ),
    example('sqd deploy my-squid#asmzf5', 'Update the "my-squid" squid with hash "asmzf5"'),
    example(
      'sqd deploy -d ./path-to-the-squid -m squid.prod.yaml',
      'Use a manifest file located in ./path-to-the-squid/squid.prod.yaml',
    ),
    example(
      'sqd deploy -d /Users/dev/path-to-the-squid -m /Users/dev/path-to-the-squid/squid.prod.yaml',
      'Full paths are also fine',
    ),
  ];

  static args = {
    squid_name_or_reference: Args.string({
      description: [
        `Reference to squid for the update.`,
        `If argument not specified, the squid name will be retrieved from the manifest or prompted and a new squid will be created.`,
        ``,
        `Alternatively, you can overwrite the name of the squid from the manifest by explicitly providing a new name instead of a reference.`,
        ``,
        `See Examples section for more information`,
      ].join('\n'),
      required: false,
    }),
  };

  static flags = {
    manifest: Flags.string({
      char: 'm',
      description: 'Relative local path to a squid manifest file in squid working directory',
      required: false,
      default: 'squid.yaml',
      helpValue: '<manifest_path>',
    }),
    dir: Flags.string({
      char: 'd',
      description: SQUID_WORKDIR_DESC.join('\n'),
      required: false,
      default: '.',
      helpValue: '<source>',
    }),
    tag: Flags.string({
      char: 't',
      description: [
        'Assign the tag to the squid deployment. ',
        'The previous deployment API URL assigned with the same tag will be transitioned to the new deployment',
        'Tag must contain only alphanumeric characters, dashes, and underscores',
      ].join('\n'),
      required: false,
      helpValue: '<tag>',
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
      description: 'Organization code',
      helpValue: '<code>',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { squid_name_or_reference },
      flags: { dir, manifest: manifestPath, 'hard-reset': hardReset, 'no-stream-logs': disableStreamLogs, org, tag },
    } = await this.parse(Deploy);

    const isUrl = dir.startsWith('http://') || dir.startsWith('https://');
    if (isUrl) {
      // this.log(`🦑 Releasing the squid from remote`);
      //
      // squid = await deployDemoSquid({
      //   orgCode,
      //   name: manifest.name,
      //   tag,
      //   data: {
      //     hardReset,
      //     artifactUrl: source,
      //     manifestPath,
      //   },
      // });
      return this.error('Not implemented yet');
    }

    const organization = await this.promptOrganization(org);

    this.log(`🦑 Releasing the squid from local folder`);

    const res = resolveManifest(dir, manifestPath);
    if ('error' in res) return this.showError(res.error, 'MANIFEST_VALIDATION_FAILED');

    const { buildDir, squidDir, manifest } = res;

    this.log(chalk.dim(`Squid directory: ${squidDir}`));
    this.log(chalk.dim(`Build directory: ${buildDir}`));
    this.log(chalk.dim(`Manifest: ${manifestPath}`));

    let reference = squid_name_or_reference?.trim();
    if (!reference) {
      reference = manifest.name;
    }

    const isUpdate = reference.includes(SQUID_HASH_SYMBOL) || reference.includes(SQUID_TAG_SYMBOL);
    const overrideName = isUpdate ? parseSquidReference(reference).name : reference;

    await this.checkNameMismatch({ fileName: path.basename(manifestPath), manifest, overrideName });

    const finalName = await this.getFinalSquidName(manifest, overrideName);

    if (tag) {
      const oldSquid = await this.findSquid({
        organization,
        reference: `${finalName}${tag.padStart(1, SQUID_TAG_SYMBOL)}`,
      });
      if (oldSquid) {
        const { confirm } = await inquirer.prompt([
          {
            name: 'confirm',
            type: 'confirm',
            message: [
              chalk.reset(
                `A squid tag "${tag}" has already been assigned to the previous squid deployment ${formatSquidName(oldSquid)}.`,
              ),
              chalk.reset(`The tag URL will be assigned to the newly created deployment.`),
              chalk.bold(`Are you sure?`),
            ].join('\n'),
          },
        ]);
        if (!confirm) return;
      }
    }

    const target = reference && isUpdate ? await this.findOrThrowSquid({ organization, reference }) : null;
    if (target) {
      /**
       * Squid exists we should check running deploys
       */
      const attached = await this.attachToParallelDeploy(target);
      if (attached) return;
    }

    const archiveName = `${manifest.name}.tar.gz`;
    const artifactPath = await this.pack({ buildDir, squidDir, archiveName });
    const artifactUrl = await this.upload({ organization, artifactPath });

    const deploy = await deploySquid({
      organization,
      data: {
        artifactUrl,
        manifestPath,
        options: {
          hardReset,
          overrideName: finalName !== manifest.name ? finalName : undefined,
          updateByHash: target?.hash,
          tag,
        },
      },
    });

    const deployment = await this.pollDeploy({ organization, deploy });
    if (!deployment || !deployment.squid) return;

    if (isUpdate) {
      this.logDeployResult(
        UPDATE_COLOR,
        `The squid ${formatSquidName(deployment.squid)} has been successfully updated`,
      );
    } else {
      this.logDeployResult(
        CREATE_COLOR,
        `A new squid ${formatSquidName(deployment.squid)}${tag ? ` with tag ${chalk.bold(tag)}` : ''} was successfully created`,
      );
    }

    if (!disableStreamLogs) {
      await this.streamLogs(organization, deployment.squid);
    }
  }

  private async checkNameMismatch({
    fileName,
    overrideName,
    manifest,
  }: {
    fileName: string;
    manifest: Manifest;
    overrideName?: string;
  }) {
    if (!manifest.name) return;
    else if (!overrideName) return;

    if (manifest.name !== overrideName) {
      this.log(
        [
          chalk.bold('Name conflict detected!'),

          `A manifest squid name ${chalk.bold(manifest.name)} does not match with specified in the argument: ${chalk.bold(overrideName)}.`,
          `If it is intended and you'd like to override the name, just skip this message and confirm, the manifest name will be overridden automatically in the Cloud during the deploy.`,
          ``,
          `Patch:`,
          diff(
            { name: fileName, content: `name: ${manifest.name}\n` },
            { name: fileName, content: `name: ${overrideName}\n` },
          ),
        ].join('\n'),
      );

      const { confirm } = await inquirer.prompt([
        {
          name: 'confirm',
          type: 'confirm',
          message: 'Are you sure?',
        },
      ]);
      if (!confirm) return;
    }
  }

  private async getFinalSquidName(manifest: Manifest, overrideName?: string) {
    if (overrideName) return overrideName;
    else if (manifest.name) return manifest.name;

    const { input } = await inquirer.prompt([
      {
        name: 'input',
        type: 'input',
        message: [
          chalk.reset(`The squid name is not defined either in the manifest or via CLI argument.`),
          chalk.reset(`Please enter the name of the squid:`),
        ].join('\n'),
      },
    ]);

    return input.name;
  }

  private async pack({ buildDir, squidDir, archiveName }: { buildDir: string; squidDir: string; archiveName: string }) {
    CliUx.ux.action.start(`◷ Compressing the squid to ${archiveName} `);

    const squidIgnore = createSquidIgnore(squidDir);
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

    CliUx.ux.action.stop(`${filesCount} files, ${prettyBytes(squidArtifactStats.size)} ${SUCCESS_CHECK_MARK}`);

    return squidArtifact;
  }

  private async upload({ organization, artifactPath }: OrganizationRequest & { artifactPath: string }) {
    CliUx.ux.action.start(`◷ Uploading ${path.basename(artifactPath)}`);

    const { error, fileUrl: artifactUrl } = await uploadFile({ organization, path: artifactPath });
    if (error) {
      return this.showError(error);
    } else if (!artifactUrl) {
      return this.showError('The artifact URL is missing', 'UPLOAD_FAILED');
    }

    CliUx.ux.action.stop(SUCCESS_CHECK_MARK);

    return artifactUrl;
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
    const raw = fs.readFileSync(path.resolve(squidDir, ignoreFilePath)).toString();

    const ignoreDir = path.dirname(ignoreFilePath);
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
