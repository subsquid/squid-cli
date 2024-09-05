import { Flags } from '@oclif/core';

import { restartSquid } from '../api';
import { SqdFlags, SquidReferenceArg } from '../command';
import { DeployCommand } from '../deploy-command';
import { formatSquidFullname } from '../utils';

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
        {
          type: 'some',
          flags: [
            { name: 'ref', when: async (flags) => !flags['tag'] },
            { name: 'tag', when: async (flags) => !flags['ref'] },
          ],
        },
      ],
    }),
    name: SqdFlags.name({
      required: false,
      relationships: [
        {
          type: 'some',
          flags: [
            { name: 'ref', when: async (flags) => !flags['tag'] },
            { name: 'tag', when: async (flags) => !flags['ref'] },
          ],
        },
      ],
    }),
    ref: SqdFlags.ref({
      required: false,
      dependsOn: ['name'],
    }),
    tag: SqdFlags.tag({
      required: false,
      dependsOn: ['name'],
      exclusive: ['ref'],
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

    const { org, name, tag, ref } = fullname ? fullname : (flags as any);
    const reference = formatSquidFullname({ name, ref, tag });

    const organization = await this.promptSquidOrganization({ code: org, name });
    await this.findOrThrowSquid({ organization, reference });

    const deployment = await restartSquid({ organization, reference });
    await this.pollDeploy({ organization, deploy: deployment });
    if (!deployment || !deployment.squid) return;

    this.logDeployResult(
      UPDATE_COLOR,
      `The squid ${formatSquidFullname({
        org: deployment.organization.code,
        name: deployment.squid.name,
        ref: deployment.squid.hash,
      })} has been successfully restarted`,
    );
  }
}
