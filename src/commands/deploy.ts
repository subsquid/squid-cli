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
import { entries, get, pick } from 'lodash';
import prettyBytes from 'pretty-bytes';
import targz from 'targz';

import { deploySquid, OrganizationRequest, Squid, uploadFile } from '../api';
import { SqdFlags, SUCCESS_CHECK_MARK } from '../command';
import { DeployCommand } from '../deploy-command';
import { loadManifestFile } from '../manifest';
import { formatSquidReference, ParsedSquidReference, printSquid } from '../utils';

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
): { error: string } | { buildDir: string; squidDir: string; manifest: Manifest; manifestRaw: string } {
  try {
    const { squidDir, manifest, manifestRaw } = loadManifestFile(localPath, manifestPath);

    const buildDir = path.join(squidDir, 'builds');
    fs.mkdirSync(buildDir, { recursive: true, mode: 0o777 });

    return {
      squidDir,
      buildDir,
      manifest,
      manifestRaw,
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
    example('sqd deploy .', 'Create a new squid with name provided in the manifest file'),
    example(
      'sqd deploy . -n my-squid-override',
      'Create a new squid deployment and override it\'s name to "my-squid-override"',
    ),
    example('sqd deploy . -n my-squid -s asmzf5', 'Update the "my-squid" squid with slot "asmzf5"'),
    example(
      'sqd deploy ./path-to-the-squid -m squid.prod.yaml',
      'Use a manifest file located in ./path-to-the-squid/squid.prod.yaml',
    ),
    example(
      'sqd deploy /Users/dev/path-to-the-squid -m /Users/dev/path-to-the-squid/squid.prod.yaml',
      'Full paths are also fine',
    ),
  ];

  static help = 'If squid flags are not specified, the they will be retrieved from the manifest or prompted.';

  static args = {
    source: Args.directory({
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
      relationships: [],
    }),
    tag: SqdFlags.tag({
      required: false,
      dependsOn: [],
    }),
    slot: SqdFlags.slot({
      required: false,
      dependsOn: [],
    }),
    reference: SqdFlags.reference({
      required: false,
    }),
    manifest: Flags.file({
      char: 'm',
      description: 'Specify the relative local path to a squid manifest file in the squid working directory',
      required: false,
      default: 'squid.yaml',
      helpValue: '<manifest_path>',
    }),
    'hard-reset': Flags.boolean({
      description:
        'Perform a hard reset before deploying. This will drop and re-create all squid resources, including the database, causing a short API downtime',
      required: false,
      default: false,
    }),
    'stream-logs': Flags.boolean({
      description: 'Attach and stream squid logs after the deployment',
      required: false,
      default: true,
      allowNo: true,
    }),
    'add-tag': Flags.string({
      description: 'Add a tag to the deployed squid',
      required: false,
    }),
    'allow-update': Flags.boolean({
      description: 'Allow updating an existing squid',
      required: false,
      default: false,
    }),
    'allow-tag-reassign': Flags.boolean({
      description: 'Allow reassigning an existing tag',
      required: false,
      default: false,
    }),
    'allow-manifest-override': Flags.boolean({
      description: 'Allow overriding the manifest during deployment',
      required: false,
      default: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { source },
      flags: {
        interactive,
        manifest: manifestPath,
        'hard-reset': hardReset,
        'stream-logs': streamLogs,
        'add-tag': addTag,
        reference,
        ...flags
      },
    } = await this.parse(Deploy);

    const isUrl = source.startsWith('http://') || source.startsWith('https://');
    if (isUrl) {
      this.log(`🦑 Releasing the squid from remote`);
      return this.error('Not implemented yet');
    }

    if (interactive && hardReset) {
      const { confirm } = await inquirer.prompt([
        {
          name: 'confirm',
          type: 'confirm',
          message: `Are you sure?`,
          prefix: `Your squid will be reset, which may potentially result in data loss.`,
        },
      ]);
      if (!confirm) return;
    }

    this.log(`🦑 Releasing the squid from local folder`);

    const res = resolveManifest(source, manifestPath);
    if ('error' in res) return this.showError(res.error, 'MANIFEST_VALIDATION_FAILED');

    const { buildDir, squidDir } = res;

    const overrides = reference || (pick(flags, 'slot', 'name', 'tag', 'org') as Partial<ParsedSquidReference>);

    let manifest = res.manifest;
    // FIXME: it is not possible to override org atm
    if (entries(overrides).some(([k, v]) => k !== 'org' && get(manifest, k) !== v)) {
      // we need to do it to keep formatting the same
      const manifestRaw = Manifest.replace(res.manifestRaw, {});
      const newManifestRaw = Manifest.replace(manifestRaw, overrides);

      if (!flags['allow-manifest-override']) {
        const confirm = await this.promptOverrideConflict(manifestRaw, newManifestRaw, { interactive });
        if (!confirm) return;
      }

      const newRes = Manifest.parse(newManifestRaw);
      if (newRes.error) return this.showError(newRes.error.message, 'MANIFEST_VALIDATION_FAILED');

      manifest = newRes.value;
    }

    const organization = await this.promptOrganization(overrides.org, { interactive });

    const name = await this.promptSquidName(manifest.squidName(), { interactive });
    const slot = manifest.slotName();
    const tag = manifest.tag;

    this.log(chalk.dim(`Squid directory: ${squidDir}`));
    this.log(chalk.dim(`Build directory: ${buildDir}`));
    this.log(chalk.dim(`Manifest: ${manifestPath}`));
    this.log(chalk.cyan(`-----------------------------`));
    this.log(chalk.cyan(`Organization: ${organization.code}`));
    this.log(chalk.cyan(`Squid name: ${name}`));
    if (slot) {
      this.log(chalk.cyan(`Squid slot: ${slot}`));
    } else if (tag) {
      this.log(chalk.cyan(`Squid tag: ${tag}`));
    }
    this.log(chalk.cyan(`-----------------------------`));

    let target: Squid | null = null;
    if (slot) {
      target = await this.findSquid({
        organization,
        squid: { name, slot },
      });
    } else if (tag) {
      target = await this.findOrThrowSquid({
        organization,
        squid: { name, tag },
      });
    }

    /**
     * Squid exists we should check running deploys
     */
    if (target) {
      const attached = await this.promptAttachToDeploy(target, { interactive });
      if (attached) return;
    }

    /**
     * Squid exists we should ask for update
     */
    if (target && !flags['allow-update']) {
      const update = await this.promptUpdateSquid(target, { interactive, tag });
      if (!update) return;
    }

    /**
     * Squid exists we should check if tag belongs to another squid
     */
    const hasTag = !!target?.tags.find((t) => t.name === addTag) || tag === addTag;
    if (addTag && !flags['allow-tag-reassign'] && !hasTag) {
      const add = await this.promptAddTag({ organization, name, tag: addTag }, { interactive });
      if (!add) return;
    }

    const archiveName = `${slot || tag ? formatSquidReference({ name, slot, tag }) : name}.tar.gz`;
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
          overrideSlot: target?.slot || slot,
          tag: addTag,
        },
      },
    });

    const deployment = await this.pollDeploy({ organization, deploy });
    if (!deployment || !deployment.squid) return;

    if (target) {
      this.logDeployResult(UPDATE_COLOR, `The squid ${printSquid(target)} has been successfully updated`);
    } else {
      this.logDeployResult(
        CREATE_COLOR,
        `A new squid ${printSquid({ ...deployment.squid, organization: deployment.organization })} has been successfully created`,
      );
    }

    if (streamLogs) {
      await this.streamLogs({ organization: deployment.organization, squid: deployment.squid });
    }
  }

  private async promptUpdateSquid(
    squid: Squid,
    {
      using = 'using "--allow-update" flag',
      interactive,
      tag,
    }: {
      using?: string;
      interactive?: boolean;
      tag?: string;
    } = {},
  ) {
    const hasOtherTags = (!tag && squid.tags.length > 0) || squid.tags.some((t) => t.name !== tag);
    const warning = [
      `The squid ${printSquid(squid)} already exists${hasOtherTags ? ` and has one or more tags assigned to it:` : ``}`,
    ];
    if (hasOtherTags) {
      warning.push(...squid.tags.map((t) => chalk.dim(` - ${t.name}`)));
    }

    if (interactive) {
      this.warn(warning.join('\n'));
    } else {
      this.error([...warning, `Please do it explicitly ${using}`].join('\n'));
    }

    const { confirm } = await inquirer.prompt([
      {
        name: 'confirm',
        type: 'confirm',
        message: 'Are you sure?',
        prefix: `The squid ${printSquid(squid)} will be updated.`,
      },
    ]);

    return !!confirm;
  }

  private async promptOverrideConflict(
    dest: string,
    src: string,
    { using = 'using "--allow--manifest-override" flag', interactive }: { using?: string; interactive?: boolean } = {},
  ) {
    const warning = [
      'Conflict detected!',
      `A manifest values do not match with specified ones.`,
      ``,
      diff({ content: dest }, { content: src }),
      ``,
    ].join('\n');

    if (interactive) {
      this.warn(warning);
    } else {
      this.error([warning, `Please do it explicitly ${using}`].join('\n'));
    }

    this.log(
      `If it is intended and you'd like to override them, just skip this message and confirm, the manifest name will be overridden automatically in the Cloud during the deploy.`,
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

  private async promptSquidName(
    name?: string | null | undefined,
    { using = 'using "--name" flag', interactive }: { using?: string; interactive?: boolean } = {},
  ) {
    if (name) return name;

    const warning = `The squid name is not defined either in the manifest or via CLI command.`;

    if (interactive) {
      this.warn(warning);
    } else {
      this.error([warning, `Please specify it explicitly ${using}`].join('\n'));
    }

    const { input } = await inquirer.prompt([
      {
        name: 'input',
        type: 'input',
        message: `Please enter the name of the squid:`,
      },
    ]);

    return input as string;
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
