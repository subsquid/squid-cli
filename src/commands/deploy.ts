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
import { defaults, get, isNil, keys, pick, pickBy } from 'lodash';
import prettyBytes from 'pretty-bytes';
import targz from 'targz';

import { deploySquid, OrganizationRequest, Squid, uploadFile } from '../api';
import { SqdFlags, SUCCESS_CHECK_MARK } from '../command';
import { DeployCommand } from '../deploy-command';
import { loadManifestFile } from '../manifest';
import { formatSquidFullname, ParsedSquidFullname, parseSquidFullname } from '../utils';

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
    // squid_name_or_reference: Args.string({
    //   description: [
    //     `Reference to squid for the update.`,
    //     `If argument not specified, the squid name will be retrieved from the manifest or prompted and a new squid will be created.`,
    //     ``,
    //     `Alternatively, you can overwrite the name of the squid from the manifest by explicitly providing a new name instead of a reference.`,
    //     ``,
    //     `See Examples section for more information`,
    //   ].join('\n'),
    //   required: false,
    // }),
    source: Args.string({
      description: [
        `Squid source. Could be:`,
        `  - a relative or absolute path to a local folder (e.g. ".")`,
        `  - a URL to a .tar.gz archive`,
        `  - a github URL to a git repo with a branch or commit tag`,
      ].join('\n'),
      required: true,
      default: '.',
    }),
  };

  static flags = {
    org: SqdFlags.org({
      required: false,
    }),
    name: SqdFlags.name({
      required: false,
    }),
    tag: SqdFlags.tag({
      required: false,
    }),
    slot: SqdFlags.slot({
      required: false,
    }),
    fullname: SqdFlags.fullname({
      required: false,
    }),
    manifest: Flags.string({
      char: 'm',
      description: 'Relative local path to a squid manifest file in squid working directory',
      required: false,
      default: 'squid.yaml',
      helpValue: '<manifest_path>',
    }),
    // dir: Flags.string({
    //   char: 'd',
    //   description: SQUID_WORKDIR_DESC.join('\n'),
    //   required: false,
    //   default: '.',
    //   helpValue: '<source>',
    // }),
    // tag: Flags.string({
    //   char: 't',
    //   description: [
    //     'Assign the tag to the squid deployment. ',
    //     'The previous deployment API URL assigned with the same tag will be transitioned to the new deployment',
    //     'Tag must contain only alphanumeric characters, dashes, and underscores',
    //   ].join('\n'),
    //   required: false,
    //   helpValue: '<tag>',
    // }),
    force: Flags.boolean({
      required: false,
      default: false,
    }),
    'hard-reset': Flags.boolean({
      description:
        'Do a hard reset before deploying. Drops and re-creates all the squid resources including the database. Will cause a short API downtime',
      required: false,
      default: false,
    }),
    'no-stream-logs': Flags.boolean({
      description: 'Do not attach and stream squid logs after the deploy',
      required: false,
      default: false,
    }),
    'apply-tag': Flags.boolean({
      required: false,
      default: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { source },
      flags: {
        manifest: manifestPath,
        'hard-reset': hardReset,
        'no-stream-logs': noStreamLogs,
        'apply-tag': applyTag,
        force,
        fullname,
        ...flags
      },
    } = await this.parse(Deploy);

    const isUrl = source.startsWith('http://') || source.startsWith('https://');
    if (isUrl) {
      this.log(`🦑 Releasing the squid from remote`);
      return this.error('Not implemented yet');
    }

    this.log(`🦑 Releasing the squid from local folder`);

    const res = resolveManifest(source, manifestPath);
    if ('error' in res) return this.showError(res.error, 'MANIFEST_VALIDATION_FAILED');

    const { buildDir, squidDir, manifest } = res;

    this.log(chalk.dim(`Squid directory: ${squidDir}`));
    this.log(chalk.dim(`Build directory: ${buildDir}`));
    this.log(chalk.dim(`Manifest: ${manifestPath}`));

    const overrides = fullname ? fullname : flags;

    // some hack to add slot name in case if version is used
    {
      manifest.slot = manifest.slotName();
      delete manifest['version'];
    }

    const override = await this.promptOverrideConflict(manifest, overrides);
    if (!override) return;

    // eslint-disable-next-line prefer-const
    let { name, slot, org, tag } = defaults(overrides, manifest);

    const organization = await this.promptOrganization(org);

    name = await this.promptSquidName(name);

    let target: Squid | null = null;
    if (slot || tag) {
      target = await this.findSquid({
        organization,
        reference: formatSquidFullname(slot ? { name, slot } : { name, tag: tag! }),
      });
    }

    /**
     * Squid exists we should check running deploys
     */
    if (target) {
      const attached = await this.promptAttachToDeploy(target);
      if (attached) return;
    }

    /**
     * Squid exists we should ask for update
     */
    if (target && !force) {
      const update = await this.promptUpdateSquid(target);
      if (!update) return;
    }

    /**
     * Squid exists we should check if tag belongs to another squid
     */
    if (target && slot && tag && !applyTag) {
      const apply = await this.promptApplyTag(target, tag);
      if (!apply) return;
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
          overrideName: name,
          overrideSlot: slot,
          tag,
        },
      },
    });

    const deployment = await this.pollDeploy({ organization, deploy });
    if (!deployment || !deployment.squid) return;

    if (target) {
      this.logDeployResult(
        UPDATE_COLOR,
        `The squid ${formatSquidFullname({
          org: deployment.organization.code,
          name: deployment.squid.name,
          slot: deployment.squid.slot,
        })} has been successfully updated`,
      );
    } else {
      this.logDeployResult(
        CREATE_COLOR,
        `A new squid ${formatSquidFullname({
          org: deployment.organization.code,
          name: deployment.squid.name,
          slot: deployment.squid.slot,
        })} has been successfully created`,
      );
    }

    if (!noStreamLogs) {
      await this.streamLogs(organization, deployment.squid);
    }
  }

  private async promptUpdateSquid(target: Squid) {
    const { confirm } = await inquirer.prompt([
      {
        name: 'confirm',
        type: 'confirm',
        message: [
          chalk.reset(
            `A squid "${formatSquidFullname({
              org: target.organization.code,
              name: target.name,
              slot: target.slot,
            })}" will be updated. ${chalk.bold('Are you sure?')}`,
          ),
        ].join('\n'),
      },
    ]);

    return !!confirm;
  }

  private async promptApplyTag(target: Squid, tag: string) {
    if (!!target.tags.find((t) => t.name === tag)) return true;

    const oldSquid = await this.findSquid({
      organization: target.organization,
      reference: formatSquidFullname({ name: target.name, tag }),
    });
    if (!oldSquid) return true;

    const { confirm } = await inquirer.prompt([
      {
        name: 'confirm',
        type: 'confirm',
        message: [
          chalk.reset(
            `A squid tag "${tag}" has already been assigned to ${formatSquidFullname({ name: oldSquid.name, slot: oldSquid.slot })}.`,
          ),
          chalk.reset(`The tag will be assigned to the newly created squid. ${chalk.bold('Are you sure?')}`),
        ].join('\n'),
      },
    ]);

    return !!confirm;
  }

  private async promptOverrideConflict(manifest: Manifest, override: Record<string, any>) {
    const conflictKeys = keys(override).filter((k) => {
      const m = get(manifest, k);
      const o = get(override, k);
      return !isNil(m) && m !== o;
    });

    if (!conflictKeys.length) return true;

    this.log(
      [
        chalk.bold('Conflict detected!'),

        `A manifest values do not match with specified ones.`,
        `If it is intended and you'd like to override them, just skip this message and confirm, the manifest name will be overridden automatically in the Cloud during the deploy.`,
        ``,
        diff(
          { content: conflictKeys.map((k) => `${k}: ${get(manifest, k)}`).join('\n') + '\n' },
          { content: conflictKeys.map((k) => `${k}: ${get(override, k)}`).join('\n') + '\n' },
        ),
      ].join('\n'),
    );

    const { confirm } = await inquirer.prompt([
      {
        name: 'confirm',
        type: 'confirm',
        message: chalk.reset(`Manifest values will be overridden. ${chalk.bold('Are you sure?')}`),
      },
    ]);

    return !!confirm;
  }

  private async promptSquidName(name?: string) {
    if (name) return name;

    const { input } = await inquirer.prompt([
      {
        name: 'input',
        type: 'input',
        message: [
          chalk.reset(`The squid name is not defined either in the manifest or via CLI command.`),
          chalk.reset(`Please enter the name of the squid:`),
        ].join('\n'),
      },
    ]);

    return input.name as string;
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
