import { Flags } from '@oclif/core';
import inquirer from 'inquirer';

import { deleteSquid } from '../api';
import { SquidReferenceArg } from '../command';
import { DeployCommand } from '../deploy-command';
import { formatSquidName } from '../utils';

import { DELETE_COLOR } from './deploy';

export default class Rm extends DeployCommand {
  static description = 'Remove a squid deployed to the Cloud';

  static args = {
    squid_reference: SquidReferenceArg,
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
      args: { squid_reference: reference },
      flags: { force, org },
    } = await this.parse(Rm);

    const organization = await this.promptSquidOrganization({ code: org, reference });
    const squid = await this.findOrThrowSquid({ organization, reference });

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

    const deploy = await deleteSquid({ organization, reference });
    await this.pollDeploy({ organization, deploy });

    this.logDeployResult(DELETE_COLOR, `A squid deployment ${reference} was successfully deleted`);
  }
}
