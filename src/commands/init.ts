import { promises as asyncFs } from 'fs';
import path from 'path';

import { Args, Flags, ux as CliUx } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { simpleGit } from 'simple-git';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';

import { CliCommand } from '../command';
import { readManifest, saveManifest } from '../manifest';

const SQUID_NAME_DESC = [
  `The squid name. It must contain only alphanumeric or dash ("-") symbols and must not start with "-".`,
  `Squid names are ${chalk.yellow('globally unique')}.`,
];

const TEMPLATE_ALIASES: Record<string, { url: string; description: string }> = {
  evm: {
    url: 'https://github.com/subsquid/squid-evm-template',
    description: `A minimal squid template for indexing EVM data.`,
  },
  abi: {
    url: 'https://github.com/subsquid/squid-abi-template',
    description: `A template to auto-generate a squid indexing events and txs from a contract ABI`,
  },
  multichain: {
    url: 'https://github.com/subsquid-labs/squid-multichain-template',
    description: `A template for indexing data from multiple chains`,
  },
  gravatar: {
    url: 'https://github.com/subsquid/gravatar-squid',
    description: 'A sample EVM squid indexing the Gravatar smart contract on Ethereum.',
  },
  substrate: {
    url: 'https://github.com/subsquid/squid-substrate-template',
    description: 'A template squid for indexing Substrate-based chains.',
  },
  ink: {
    url: 'https://github.com/subsquid/squid-wasm-template',
    description: `A template for indexing Ink! smart contracts`,
  },
  'ink-abi': {
    url: 'https://github.com/subsquid-labs/squid-ink-abi-template',
    description: `A template to auto-generate a squid from an ink! contract ABI`,
  },
  'frontier-evm': {
    url: 'https://github.com/subsquid/squid-frontier-evm-template',
    description: 'A template for indexing Frontier EVM chains, like Moonbeam and Astar.',
  },
};

const git = simpleGit({
  baseDir: process.cwd(),
  binary: 'git',
});

async function directoryIsEmpty(path: string) {
  try {
    const directory = await asyncFs.opendir(path);
    const entry = await directory.read();
    await directory.close();

    return entry === null;
  } catch (e: any) {
    if (e.code === 'ENOENT') return true;

    return false;
  }
}

const SQUID_TEMPLATE_DESC = [
  `A template for the squid. Accepts: `,
  `- a ${chalk.bold('github repository URL')} containing a valid ${chalk.italic(
    'squid.yaml',
  )} manifest in the root folder `,
  ` or one of the pre-defined aliases:`,
  ...Object.entries(TEMPLATE_ALIASES).map(([alias, { description }]) => `     - ${chalk.bold(alias)}  ${description}`),
];

export default class Init extends CliCommand {
  static description = 'Setup a new squid project from a template or github repo';

  static args = {
    name: Args.string({ description: SQUID_NAME_DESC.join('\n'), required: true }),
  };

  static flags = {
    template: Flags.string({
      char: 't',
      description: SQUID_TEMPLATE_DESC.join('\n'),
      required: false,
    }),
    dir: Flags.string({
      char: 'd',
      description: 'The target location for the squid. If omitted, a new folder NAME is created.',
      required: false,
    }),
    remove: Flags.boolean({
      char: 'r',
      description: 'Clean up the target directory if it exists',
      required: false,
    }),
  };

  async run() {
    const {
      args: { name },
      flags: { template, dir, remove },
    } = await this.parse(Init);

    const localDir = path.resolve(dir || name);
    const isEmptyDir = await directoryIsEmpty(localDir);
    if (!isEmptyDir) {
      if (!remove) {
        return this.error(
          `The folder "${localDir}" already exists. Use the "-r" flag to init the squid at the existing path (will clean the folder first).`,
        );
      }

      await asyncFs.rm(localDir, { recursive: true });
    }

    let resolvedTemplate = template || '';
    if (!template) {
      const { alias } = await inquirer.prompt({
        name: 'alias',
        message: `Please select one of the templates for your "${name}" squid:`,
        type: 'list',

        choices: Object.entries(TEMPLATE_ALIASES).map(([name, { description }]) => {
          return {
            name: `${name}. ${chalk.dim(description)}`,
            value: name,
          };
        }),
      });

      resolvedTemplate = alias;
    }

    const githubRepository = TEMPLATE_ALIASES[resolvedTemplate]
      ? TEMPLATE_ALIASES[resolvedTemplate].url
      : resolvedTemplate;

    try {
      const uniqueNameSuggestion = uniqueNamesGenerator({
        dictionaries: [adjectives, colors, animals],
        separator: '-',
        length: 2,
      });
      return this.error(
        `There is already a squid with name "${name}" deployed to the Cloud. Squid names are globally unique. ` +
          `Please pick a new memorable name, e.g. "${uniqueNameSuggestion}".`,
      );
    } catch (e) {}

    CliUx.ux.action.start(`◷ Downloading the template: ${githubRepository}... `);
    try {
      // TODO: support branches?
      await git.clone(githubRepository, localDir, {});
    } catch (e: any) {
      return this.error(e);
    }
    CliUx.ux.action.stop(`✔`);

    /** Clean up template **/
    await asyncFs.rm(path.resolve(localDir, '.git'), { recursive: true });

    /** Remove deprecated files from repositories **/
    try {
      await asyncFs.rm(path.resolve(localDir, 'Dockerfile'));
    } catch (e) {}

    const manifestPath = path.resolve(localDir, 'squid.yaml');
    try {
      const manifest = readManifest(manifestPath);

      /** Override name in squid manifest **/
      manifest.name = name;

      saveManifest(manifestPath, manifest);
    } catch (e: any) {
      return this.error(e);
    }

    this.log(`The squid is created in ${localDir}`);
  }
}
