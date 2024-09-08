import { Args, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';

import { addSquidTag } from '../../api';
import { SqdFlags } from '../../command';
import { DeployCommand } from '../../deploy-command';
import { formatSquidFullname } from '../../utils';
import { UPDATE_COLOR } from '../deploy';

export default class Add extends DeployCommand {
  static description = 'Add a tag to a squid';

  static args = {
    tag: Args.string({
      description: `New tag to assign`,
      required: true,
    }),
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
  };

  async run(): Promise<void> {
    const {
      args: { tag: tagName },
      flags: { fullname, ...flags },
    } = await this.parse(Add);

    this.validateSquidNameFlags({ fullname, ...flags });

    const { org, name, tag, slot } = fullname ? fullname : (flags as any);
    const reference = formatSquidFullname({ name, slot, tag });

    const organization = await this.promptSquidOrganization({ code: org, name });
    const squid = await this.findOrThrowSquid({ organization, reference });

    if (squid.tags.find((t) => t.name === tagName)) {
      return this.log(
        `Tag "${tagName}" is already assigned to the squid ${formatSquidFullname({ org, name, tag, slot })}`,
      );
    }

    const oldSquid = await this.findSquid({ organization, reference: formatSquidFullname({ name, tag: tagName }) });
    if (oldSquid) {
      const { confirm } = await inquirer.prompt([
        {
          name: 'confirm',
          type: 'confirm',
          message: [
            chalk.reset(
              `A squid tag "${tagName}" has already been assigned to the previous squid deployment ${formatSquidFullname({ org, name, slot: oldSquid.slot })}.`,
            ),
            chalk.reset(`The tag URL will be assigned to the newly created deployment. ${chalk.bold(`Are you sure?`)}`),
          ].join('\n'),
        },
      ]);
      if (!confirm) return;
    }

    const deployment = await addSquidTag({
      organization,
      reference,
      tag: tagName,
    });
    await this.pollDeploy({ organization, deploy: deployment });
    if (!deployment || !deployment.squid) return;

    this.logDeployResult(
      UPDATE_COLOR,
      `The squid ${formatSquidFullname({
        org: deployment.organization.code,
        name: deployment.squid.name,
        slot: deployment.squid.slot,
      })} has been successfully updated`,
    );
  }
}
