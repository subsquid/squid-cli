import { Args } from '@oclif/core';

import { removeSquidTag } from '../../api';
import { SqdFlags } from '../../command';
import { DeployCommand } from '../../deploy-command';
import { formatSquidReference, printSquid } from '../../utils';
import { UPDATE_COLOR } from '../deploy';

export default class Remove extends DeployCommand {
  static description = 'Remove a tag from a squid';

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
  };

  async run(): Promise<void> {
    const {
      args: { tag: tagName },
      flags: { reference, interactive, ...flags },
    } = await this.parse(Remove);

    this.validateSquidNameFlags({ reference, ...flags });

    const { org, name, tag, slot } = reference ? reference : (flags as any);

    const organization = await this.promptSquidOrganization(org, name, { interactive });
    const squid = await this.findOrThrowSquid({ organization, squid: { name, tag, slot } });

    if (!squid.tags.some((t) => t.name === tagName)) {
      return this.log(`Tag "${tagName}" is not assigned to the squid ${printSquid(squid)}`);
    }

    const attached = await this.promptAttachToDeploy(squid, { interactive });
    if (attached) return;

    const deployment = await removeSquidTag({
      organization,
      squid,
      tag: tagName,
    });
    await this.pollDeploy({ organization, deploy: deployment });
    if (!deployment || !deployment.squid) return;

    this.logDeployResult(UPDATE_COLOR, `The squid ${printSquid(squid)} has been successfully updated`);
  }
}
