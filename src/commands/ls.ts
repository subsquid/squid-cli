import { ux as CliUx, Flags } from '@oclif/core';

import { listSquids } from '../api';
import { CliCommand } from '../command';

export default class Ls extends CliCommand {
  static aliases = ['squid:ls'];
  static description = 'List squids and squid versions deployed to the Cloud';

  static flags = {
    name: Flags.string({
      char: 'n',
      description: 'squid name',
      required: false,
    }),
    truncate: Flags.boolean({
      char: 't',
      description: 'truncate data in columns: false by default',
      required: false,
      default: false,
    }),
    org: Flags.string({
      char: 'o',
      description: 'Organization',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { org, truncate, name },
    } = await this.parse(Ls);
    const noTruncate = !truncate;

    const organization = name
      ? await this.promptSquidOrganization(org, name, 'using "-o" flag')
      : await this.promptOrganization(org, 'using "-o" flag');

    const squids = await listSquids({ organization, name });
    if (squids) {
      CliUx.ux.table(
        squids,
        {
          name: {
            header: 'Name',
          },
          // description: {},
          slot: {
            header: 'Deploy ID',
            get: (s) => (s.slot ? `#${s.slot}` : `-`),
          },
          tags: {
            header: 'Tags',
            get: (s) =>
              s.tags
                .map((t) => `@${t.name}`)
                .sort()
                .join(', '),
          },
          // urls: {
          //   header: 'API Urls',
          //   get: (s) => s.urls.map((u) => u.url).join('\n'),
          // },
          status: {
            header: 'Status',
            get: (s) => s.status?.toUpperCase(),
          },
          deployedAt: {
            header: 'Deployed at',
            get: (s) => (s.deployedAt ? new Date(s.deployedAt).toUTCString() : `-`),
          },
        },
        { 'no-truncate': noTruncate },
      );
    }
  }
}
