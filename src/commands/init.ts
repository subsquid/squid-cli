import fs from 'fs';
import path from 'path';

import { CliUx, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import simpleGit from 'simple-git';

import { squidNameIsAvailable } from '../api';
import { CliCommand } from '../command';
import { Manifest } from '../manifest';

const SQUID_NAME_DESC = [
  `The squid name. It must contain only alphanumeric or dash ("-") symbols and must not start with "-".`,
  `Squid names are ${chalk.yellow('globally unique')}.`,
];

const TEMPLATE_ALIASES: Record<string, { url: string, description: string }> = {
  evm: {
    url: 'https://github.com/subsquid/squid-evm-template',
    description: `A minimal squid template for indexing EVM data.`
  },
  gravatar: {
    url: 'https://github.com/subsquid/gravatar-squid',
    description: 'A sample EVM squid indexing the Gravatar smart contract on Ethereum.'
  },
  substrate: {
    url: 'https://github.com/subsquid/squid-substrate-template',
    description: 'A template squid for indexing Substrate-based chains.'
  },
  'frontier-evm': {
    url: 'https://github.com/subsquid/squid-frontier-evm-template',
    description: 'A template for indexing Frontier EVM chains, like Moonbeam and Astar.'
  },
};

const git = simpleGit({
  baseDir: process.cwd(),
  binary: 'git',
});

const SQUID_TEMPLATE_DESC = [
  `A template for the squid. Accepts: `,
  `- a ${chalk.bold('github repository URL')} containing a valid ${chalk.italic(
    'squid.yaml',
  )} manifest in the root folder `,
  ` or one of the pre-defined aliases:`,
  ...Object.entries(TEMPLATE_ALIASES).map(([alias, { url, description }]) => `     - ${chalk.bold(alias)}  ${description}`),
];

export default class Init extends CliCommand {
  static description = 'Create a squid from template';

  static args = [
    {
      name: 'name',
      description: SQUID_NAME_DESC.join('\n'),
      required: true,
    },
  ];

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

    let resolvedTemplate = template || '';
    if (!template) {
      const { alias } = await inquirer.prompt({
        name: 'alias',
        message: `Please choose one of the pre-defined templates for your "${name}" squid`,
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
    const localDir = path.resolve(dir || name);

    if (!(await squidNameIsAvailable(name))) {
      return this.error(`A squid with the name "${name}" already exists. Please pick a different name.`);
    }

    if (fs.existsSync(localDir)) {
      if (remove) {
        fs.rmSync(localDir, { recursive: true });
      } else {
        return this.error(
          `The folder ${localDir} already exists. Use the "-r" flag to init the squid at the existing path (will clean the folder first).`,
        );
      }
    }

    CliUx.ux.action.start(`◷ Downloading the template: ${githubRepository}... `);
    try {
      // TODO: support branches?
      await git.clone(githubRepository, localDir, {});
    } catch (e: any) {
      return this.error(e);
    }
    CliUx.ux.action.stop(`✔`);

    fs.rmSync(path.resolve(localDir, '.git'), { recursive: true });

    const manifestPath = path.resolve(localDir, 'squid.yaml');
    try {
      const manifestValue = yaml.load(fs.readFileSync(manifestPath).toString()) as Manifest;

      manifestValue.name = name;

      fs.writeFileSync(manifestPath, yaml.dump(manifestValue));
    } catch (e: any) {
      return this.error(e);
    }

    this.log(`The squid is created in ${localDir}`);
  }
}
