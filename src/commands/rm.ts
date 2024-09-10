import { Flags } from '@oclif/core';
import inquirer from 'inquirer';

import { deleteSquid } from '../api';
import { SqdFlags } from '../command';
import { DeployCommand } from '../deploy-command';
import { formatSquidReference, printSquid } from '../utils';

import { DELETE_COLOR } from './deploy';

export default class Rm extends DeployCommand {
  static description = 'Remove a squid deployed to the Cloud';

  static flags = {
    org: SqdFlags.org({
      required: false,
    }),
    name: SqdFlags.name({
      required: false,
    }),
    slot: SqdFlags.slot({
      required: false,
    }),
    tag: SqdFlags.tag({
      required: false,
    }),
    fullname: SqdFlags.fullname({
      required: false,
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Does not prompt before removing a squid or its version',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { interactive, force, fullname, ...flags },
    } = await this.parse(Rm);

    this.validateSquidNameFlags({ fullname, ...flags });

    const { org, name, tag, slot } = fullname ? fullname : (flags as any);

    const organization = await this.promptSquidOrganization(org, name, { interactive });
    const squid = await this.findOrThrowSquid({ organization, squid: { name, slot, tag } });

    if (!force) {
      const { confirm } = await inquirer.prompt([
        {
          name: 'confirm',
          type: 'confirm',
          message: `Your squid ${printSquid(squid)} will be completely removed. This action can not be undone. Are you sure?`,
        },
      ]);
      if (!confirm) return;
    }

    const deployment = await deleteSquid({ organization, squid });
    await this.pollDeploy({ organization, deploy: deployment });
    if (!deployment || !deployment.squid) return;

    this.logDeployResult(DELETE_COLOR, `A squid deployment ${printSquid(squid)} was successfully deleted`);
  }
}
