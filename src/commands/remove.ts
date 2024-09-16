import { Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';

import { deleteSquid } from '../api';
import { SqdFlags } from '../command';
import { DeployCommand } from '../deploy-command';
import { ParsedSquidReference, printSquid } from '../utils';

import { DELETE_COLOR } from './deploy';

export default class Remove extends DeployCommand {
  static description = 'Remove a squid deployed to the Cloud';

  static aliases = ['rm'];

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
    reference: SqdFlags.reference({
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
      flags: { interactive, force, reference, ...flags },
    } = await this.parse(Remove);

    this.validateSquidNameFlags({ reference, ...flags });

    const { org, name, tag, slot } = reference || (flags as ParsedSquidReference);

    const organization = await this.promptSquidOrganization(org, name, { interactive });
    const squid = await this.findOrThrowSquid({ organization, squid: { name, slot, tag } });

    const attached = await this.promptAttachToDeploy(squid, { interactive });
    if (attached) return;

    if (!force && interactive) {
      const { confirm } = await inquirer.prompt([
        {
          name: 'confirm',
          type: 'confirm',
          message: `Are you sure?`,
          prefix: `The squid ${printSquid(squid)} will be completely removed. This action can not be undone.`,
        },
      ]);
      if (!confirm) return;
    }

    const deployment = await deleteSquid({ organization, squid });
    await this.pollDeploy({ organization, deploy: deployment });
    if (!deployment || !deployment.squid) return;

    this.logDeployResult(DELETE_COLOR, `The squid ${printSquid(squid)} was successfully deleted`);
  }
}
