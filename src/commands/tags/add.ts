import { Args, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';

import { addSquidTag } from '../../api';
import { SqdFlags } from '../../command';
import { DeployCommand } from '../../deploy-command';
import { formatSquidReference, printSquid } from '../../utils';
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
    force: Flags.boolean({
      required: false,
      default: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { tag: tagName },
      flags: { fullname, interactive, force, ...flags },
    } = await this.parse(Add);

    this.validateSquidNameFlags({ fullname, ...flags });

    const { org, name, tag, slot } = fullname ? fullname : (flags as any);

    const organization = await this.promptSquidOrganization(org, name, { interactive });
    const squid = await this.findOrThrowSquid({ organization, squid: { name, slot, tag } });

    if (squid.tags.find((t) => t.name === tagName)) {
      return this.log(`Tag "${tagName}" is already assigned to the squid ${printSquid(squid)}`);
    }

    if (!force) {
      const confirm = await this.promptAddTag(
        {
          organization,
          name,
          tag: tagName,
        },
        { interactive },
      );
      if (!confirm) return;
    }

    const deployment = await addSquidTag({
      organization,
      squid,
      tag: tagName,
    });
    await this.pollDeploy({ organization, deploy: deployment });
    if (!deployment || !deployment.squid) return;

    this.logDeployResult(UPDATE_COLOR, `The squid ${printSquid(squid)} has been successfully updated`);
  }
}
