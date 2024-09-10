import { ux as CliUx, Flags } from '@oclif/core';

import { listSquids } from '../api';
import { CliCommand, SqdFlags } from '../command';
import { printSquid } from '../utils';

export default class Ls extends CliCommand {
  static description = 'List squids deployed to the Cloud';

  static flags = {
    org: SqdFlags.org({
      required: false,
    }),
    name: SqdFlags.name({
      required: false,
      relationships: [],
    }),
    tag: SqdFlags.tag({
      required: false,
      dependsOn: [],
    }),
    slot: SqdFlags.slot({
      required: false,
      dependsOn: [],
    }),
    fullname: SqdFlags.fullname({
      required: false,
    }),
    truncate: Flags.boolean({
      description: 'Truncate data in columns: false by default',
      required: false,
      default: false,
      allowNo: true,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { truncate, fullname, interactive, ...flags },
    } = await this.parse(Ls);

    const { org, name, slot, tag } = fullname ? fullname : (flags as any);

    const organization = name
      ? await this.promptSquidOrganization(org, name, { interactive })
      : await this.promptOrganization(org, { interactive });

    let squids = await listSquids({ organization, name });
    if (tag || slot) {
      squids = squids.filter((s) => s.slot === slot || s.tags.some((t) => t.name === tag));
    }
    if (squids.length) {
      CliUx.ux.table(
        squids,
        {
          name: {
            header: 'Squid',
            get: (s) => `${printSquid(s)}`,
          },
          tags: {
            header: 'Tags',
            get: (s) =>
              s.tags
                .map((t) => t.name)
                .sort()
                .join(', '),
          },
          status: {
            header: 'Status',
            get: (s) => s.status?.toUpperCase(),
          },
          deployedAt: {
            header: 'Deployed',
            get: (s) => (s.deployedAt ? new Date(s.deployedAt).toUTCString() : `-`),
          },
        },
        { 'no-truncate': !truncate },
      );
    }
  }
}
