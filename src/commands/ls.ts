import { CliUx, Flags } from '@oclif/core';

import { getSquid, squidList } from '../api';
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
    project: Flags.string({
      char: 'p',
      description: 'Project',
      required: false,
      hidden: true,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { project, truncate, name },
    } = await this.parse(Ls);
    const noTruncate = !truncate;

    if (name) {
      const squid = await getSquid(name);
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
      const squids = await squidList({ projectCode: project });
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
