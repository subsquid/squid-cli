import { Args, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';

import { tagSquid } from '../api';
import { SquidReferenceArg } from '../command';
import { DeployCommand } from '../deploy-command';
import { formatSquidName } from '../utils';

import { UPDATE_COLOR } from './deploy';

export default class Tag extends DeployCommand {
  static description = 'Set a tag for squid';

  static args = {
    squid_reference: SquidReferenceArg,

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
      args: { squid_reference: reference, tag },
      flags: { org },
    } = await this.parse(Tag);

    const organization = await this.promptSquidOrganization({ code: org, reference });
    const squid = await this.findOrThrowSquid({ organization, reference });

    if (squid.tags.find((t) => t.name === tag)) {
      return this.log(`Tag ${tag} is already assigned to the squid ${formatSquidName(squid)}`);
    }

    const oldSquid = await this.findSquid({ organization, reference: `${squid.name}@${tag}` });
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

    const deploy = await tagSquid({
      organization,
      reference,
      data: {
        tag,
      },
    });
    await this.pollDeploy({ organization, deploy });

    this.logDeployResult(UPDATE_COLOR, `The squid ${squid.name}#${squid.hash} has been successfully updated`);
  }
}
