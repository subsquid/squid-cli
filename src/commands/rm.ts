import { Args, ux as CliUx, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';

import { deleteSquid } from '../api';
import { SquidNameArg } from '../command';
import { DeployCommand } from '../deploy-command';
import { formatSquidName, parseSquidName } from '../utils';

import { CREATE_COLOR, DELETE_COLOR } from './deploy';

export default class Rm extends DeployCommand {
  static aliases = ['squid:kill', 'kill'];

  static description = 'Remove a squid or a squid version deployed to the Cloud';

  static args = {
    squidName: SquidNameArg,
  };

  static flags = {
    force: Flags.boolean({
      char: 'f',
      description: 'Does not prompt before removing a squid or its version',
      required: false,
    }),
    org: Flags.string({
      char: 'o',
      description: 'Organization',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { squidName },
      flags: { force, org },
    } = await this.parse(Rm);

    const filter = parseSquidName(squidName);

    const organization = await this.promptSquidOrganization(org, filter.name, 'using "-o" flag');
    const squid = await this.findOrThrowSquid({ organization, ...filter });

    if (!force) {
      const { confirm } = await inquirer.prompt([
        {
          name: 'confirm',
          type: 'confirm',
          message: `Your squid ${formatSquidName(squid)} will be completely removed. This action can not be undone. Are you sure?`,
        },
      ]);
      if (!confirm) return;
    }

    const deploy = await deleteSquid({ organization, squid });
    await this.pollDeploy({ organization, deploy });

    this.log(
      [
        '',
        chalk[DELETE_COLOR](`-------------------------------------------------`),
        `A squid deployment ${squid.name}#${squid.slot} was successfully deleted`,
        chalk[DELETE_COLOR](`-------------------------------------------------`),
      ].join('\n'),
    );
  }
}
