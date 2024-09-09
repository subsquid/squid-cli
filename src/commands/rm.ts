import { Flags } from '@oclif/core';
import inquirer from 'inquirer';

import { deleteSquid } from '../api';
import { SqdFlags, SquidReferenceArg } from '../command';
import { DeployCommand } from '../deploy-command';
import { formatSquidFullname, printSquidFullname } from '../utils';

import { DELETE_COLOR } from './deploy';

export default class Rm extends DeployCommand {
  static description = 'Remove a squid deployed to the Cloud';

  static args = {
    squid_reference: SquidReferenceArg,
  };

  static flags = {
    org: SqdFlags.org({
      required: false,
      relationships: [
        {
          type: 'all',
          flags: ['name'],
        },
      ],
    }),
    name: SqdFlags.name({
      required: false,
      relationships: [
        {
          type: 'some',
          flags: [
            { name: 'slot', when: async (flags) => !flags['tag'] },
            { name: 'tag', when: async (flags) => !flags['slot'] },
          ],
        },
      ],
    }),
    slot: SqdFlags.slot({
      required: false,
      dependsOn: ['name'],
    }),
    tag: SqdFlags.tag({
      required: false,
      dependsOn: ['name'],
      exclusive: ['slot'],
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
      flags: { force, fullname, ...flags },
    } = await this.parse(Rm);

    this.validateSquidNameFlags({ fullname, ...flags });

    const { org, name, tag, slot } = fullname ? fullname : (flags as any);
    const reference = formatSquidFullname({ name, slot, tag });

    const organization = await this.promptSquidOrganization({ code: org, name });
    const squid = await this.findOrThrowSquid({ organization, reference });

    if (!force) {
      const { confirm } = await inquirer.prompt([
        {
          name: 'confirm',
          type: 'confirm',
          message: `Your squid ${printSquidFullname({ org, name, slot: squid.slot })} will be completely removed. This action can not be undone. Are you sure?`,
        },
      ]);
      if (!confirm) return;
    }

    const deployment = await deleteSquid({ organization, reference });
    await this.pollDeploy({ organization, deploy: deployment });
    if (!deployment || !deployment.squid) return;

    this.logDeployResult(
      DELETE_COLOR,
      `A squid deployment ${printSquidFullname({
        org: deployment.organization.code,
        name: deployment.squid.name,
        slot: deployment.squid.slot,
      })} was successfully deleted`,
    );
  }
}
