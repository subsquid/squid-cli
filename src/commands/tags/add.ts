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
    'allow-tag-reassign': Flags.boolean({
      description: 'Allow reassigning an existing tag',
      required: false,
      default: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { tag: tagName },
      flags: { reference, interactive, ...flags },
    } = await this.parse(Add);

    this.validateSquidNameFlags({ reference, ...flags });

    const { org, name, tag, slot } = reference ? reference : (flags as any);

    const organization = await this.promptSquidOrganization(org, name, { interactive });
    const squid = await this.findOrThrowSquid({ organization, squid: { name, slot, tag } });

    if (squid.tags.find((t) => t.name === tagName)) {
      return this.log(`Tag "${tagName}" is already assigned to the squid ${printSquid(squid)}`);
    }

    if (!flags['allow-tag-reassign']) {
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

    const attached = await this.promptAttachToDeploy(squid, { interactive });
    if (attached) return;

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
