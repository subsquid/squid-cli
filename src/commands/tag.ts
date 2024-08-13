// import { buildTable, updateDemoTag } from '../api/demoStore';
import { Args, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';

import { tagSquid } from '../api';
import { SquidNameArg } from '../command';
import { DeployCommand } from '../deploy-command';
import { formatSquidName, parseSquidName } from '../utils';

import { UPDATE_COLOR } from './deploy';

export default class Tag extends DeployCommand {
  static description = 'Set a tag for squid';

  static args = {
    squid: SquidNameArg,
    tag: Args.string({
      description: `New tag to assign`,
      required: true,
    }),
  };

  static flags = {
    org: Flags.string({
      char: 'o',
      description: 'Organization',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { squid: squidName, tag },
      flags: { org },
    } = await this.parse(Tag);

    const filter = parseSquidName(squidName);

    const organization = await this.promptSquidOrganization(org, filter.name, 'using "-o" flag');
    const squid = await this.findOrThrowSquid({ organization, ...filter });

    const normalizedTag = tag.startsWith('@') ? tag.slice(1) : tag;
    const oldSquid = await this.findSquid({ organization, name: filter.name, tag: normalizedTag });
    if (oldSquid) {
      const { confirm } = await inquirer.prompt([
        {
          name: 'confirm',
          type: 'confirm',
          message: `A squid tag @${normalizedTag} has already been assigned to the previous squid deployment ${formatSquidName(oldSquid)}. Are you sure?`,
        },
      ]);
      if (!confirm) return;
    }

    const deploy = await tagSquid({
      organization,
      squid,
      data: {
        tag,
      },
    });
    await this.pollDeploy({ organization, deploy });

    this.log(
      [
        '',
        chalk[UPDATE_COLOR](`=================================================`),
        `The squid ${squid.name}#${squid.slot} has been successfully updated`,
        chalk[UPDATE_COLOR](`=================================================`),
      ].join('\n'),
    );
  }
}
