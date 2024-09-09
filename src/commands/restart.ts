import { Flags } from '@oclif/core';
import { isNil, omitBy } from 'lodash';

import { restartSquid } from '../api';
import { SqdFlags } from '../command';
import { DeployCommand } from '../deploy-command';
import { formatSquidFullname, printSquidFullname } from '../utils';

import { UPDATE_COLOR } from './deploy';

export default class Restart extends DeployCommand {
  static description = 'Restart a squid deployed to the Cloud';

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
      flags: { fullname, ...flags },
    } = await this.parse(Restart);

    this.validateSquidNameFlags({ fullname, ...flags });

    const { org, name, tag, slot } = fullname ? fullname : omitBy(flags, isNil);
    const reference = formatSquidFullname({ name, slot, tag });

    const organization = await this.promptSquidOrganization({ code: org, name });
    await this.findOrThrowSquid({ organization, reference });

    const deployment = await restartSquid({ organization, reference });
    await this.pollDeploy({ organization, deploy: deployment });
    if (!deployment || !deployment.squid) return;

    this.logDeployResult(
      UPDATE_COLOR,
      `The squid ${printSquidFullname({
        org: deployment.organization.code,
        name: deployment.squid.name,
        slot: deployment.squid.slot,
      })} has been successfully restarted`,
    );
  }
}
