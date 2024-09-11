import { Flags } from '@oclif/core';
import { isNil, omitBy } from 'lodash';

import { restartSquid } from '../api';
import { SqdFlags } from '../command';
import { DeployCommand } from '../deploy-command';
import { formatSquidReference as formatSquidReference, printSquid } from '../utils';

import { UPDATE_COLOR } from './deploy';

export default class Restart extends DeployCommand {
  static description = 'Restart a squid deployed to the Cloud';

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
  };

  async run(): Promise<void> {
    const {
      flags: { fullname, interactive, ...flags },
    } = await this.parse(Restart);

    this.validateSquidNameFlags({ fullname, ...flags });

    const { org, name, tag, slot } = fullname ? fullname : (flags as any);

    const organization = await this.promptSquidOrganization(org, name, { interactive });
    const squid = await this.findOrThrowSquid({ organization, squid: { name, tag, slot } });

    const attached = await this.promptAttachToDeploy(squid, { interactive });
    if (attached) return;

    const deployment = await restartSquid({ organization, squid });
    await this.pollDeploy({ organization, deploy: deployment });
    if (!deployment || !deployment.squid) return;

    this.logDeployResult(UPDATE_COLOR, `The squid ${printSquid(squid)} has been successfully restarted`);
  }
}
