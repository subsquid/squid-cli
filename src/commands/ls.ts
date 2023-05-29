import { CliUx, Flags } from '@oclif/core';

import { getSquid, squidList, promptOrganization } from '../api';
import { CliCommand } from '../command';

export default class Ls extends CliCommand {
  static aliases = ['squid:ls'];
  static description = 'List squids and squid versions';

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

    const organization = await promptOrganization(org);

    if (name) {
      const squid = await getSquid({ squidName: name });

      if (squid.versions) {
        CliUx.ux.table(
          squid.versions,
          {
            name: { header: 'Version' },
            artifactUrl: { header: 'Source' },
            deploymentUrl: { header: 'Endpoint' },
            status: { header: 'Status' },
            secretsStatus: { header: 'Secrets' },
            createdAt: { header: 'Created at' },
          },
          { 'no-truncate': noTruncate },
        );
      }
    } else {
      const squids = await squidList({ organization });
      if (squids) {
        CliUx.ux.table(
          squids,
          {
            name: {},
            description: {},
          },
          { 'no-truncate': noTruncate },
        );
      }
    }
  }
}
