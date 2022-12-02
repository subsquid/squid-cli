import fs from 'fs';
import path from 'path';

import { CliUx, Flags } from '@oclif/core';
import chalk from 'chalk';
import yaml from 'js-yaml';
import simpleGit from 'simple-git';

import { squidNameIsAvailable } from '../api';
import { CliCommand } from '../command';
import { Manifest } from '../manifest';

const SQUID_NAME_DESC = [
  `Squid name. Must contains only alphanumeric and "-" symbols and do not start with "-".`,
  `Squid names are ${chalk.yellow('globally unique')}.`,
];

const TEMPLATE_ALIASES: Record<string, { url: string }> = {
  substrate: {
    url: 'https://github.com/subsquid/squid-substrate-template',
  },
  evm: {
    url: 'https://github.com/subsquid/squid-evm-template',
  },
  'frontier-evm': {
    url: 'https://github.com/subsquid/squid-frontier-evm-template',
  },
};

const git = simpleGit({
  baseDir: process.cwd(),
  binary: 'git',
});

const SQUID_TEMPLATE_DESC = [
  `A github repository for initial files.`,
  `Any ${chalk.bold('custom github repository URL')}, contains ${chalk.italic(
    'squid.yaml',
  )} manifest in the directory root or pre-defined alias:`,
  ...Object.entries(TEMPLATE_ALIASES).map(([alias, { url }]) => `     - ${chalk.bold(alias)}  ${url}`),
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
      default: 'substrate',
    }),
    dir: Flags.string({
      char: 'd',
      description: 'Target directory for new squid, by default it is same as specified NAME argument',
      required: false,
    }),
    remove: Flags.boolean({
      char: 'r',
      description: 'Clean up target directory before install if exists',
      required: false,
    }),
  };

  async run() {
    const {
      args: { name },
      flags: { template, dir, remove },
    } = await this.parse(Init);

    const githubRepository = TEMPLATE_ALIASES[template] ? TEMPLATE_ALIASES[template].url : template;
    const localDir = path.resolve(dir || name);

    if (!(await squidNameIsAvailable(name))) {
      return this.error(`Squid name "${name}" is already exists. Please choose another one.`);
    }

    if (remove && fs.existsSync(localDir)) {
      fs.rmSync(localDir, { recursive: true });
    }

    CliUx.ux.action.start(`◷ Downloading template from ${githubRepository}... `);
    try {
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

    this.log(`Squid directory is ready in ${localDir}`);
  }
}
