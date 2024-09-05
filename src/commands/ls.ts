import { ux as CliUx, Flags } from '@oclif/core';
import chalk from 'chalk';

import { listSquids } from '../api';
import { CliCommand, SqdFlags } from '../command';

export default class Ls extends CliCommand {
  static description = 'List squids deployed to the Cloud';

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
    }),
    fullname: SqdFlags.fullname({
      required: false,
    }),
    truncate: Flags.boolean({
      char: 't',
      description: 'Truncate data in columns: false by default',
      required: false,
      default: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { truncate, fullname, ...flags },
    } = await this.parse(Ls);
    const noTruncate = !truncate;

    const { org, name } = fullname ? fullname : (flags as any);

    const organization = name
      ? await this.promptSquidOrganization({ code: org, name })
      : await this.promptOrganization(org);

    const squids = await listSquids({ organization, name });
    if (squids) {
      CliUx.ux.table(
        squids,
        {
          name: {
            header: 'Squid',
            get: (s) => `${s.name}${chalk.dim(`@${s.hash}`)}`,
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
        { 'no-truncate': noTruncate },
      );
    }
  }
}
