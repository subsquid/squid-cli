import { ux as CliUx, Flags } from '@oclif/core';
import chalk from 'chalk';

import { listSquids } from '../api';
import { CliCommand } from '../command';

export default class Ls extends CliCommand {
  static description = 'List squids deployed to the Cloud';

  static flags = {
    name: Flags.string({
      char: 'n',
      description: 'Filter by squid name',
      required: false,
    }),
    truncate: Flags.boolean({
      char: 't',
      description: 'Truncate data in columns: false by default',
      required: false,
      default: false,
    }),
    org: Flags.string({
      char: 'o',
      description: 'Organization code',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { org, truncate, name },
    } = await this.parse(Ls);
    const noTruncate = !truncate;

    const organization = name
      ? await this.promptSquidOrganization({ code: org, reference: name })
      : await this.promptOrganization(org);

    const squids = await listSquids({ organization, name });
    if (squids) {
      CliUx.ux.table(
        squids,
        {
          name: {
            header: 'Squid',
            get: (s) => `${s.name}${chalk.dim(`:${s.hash}`)}`,
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
