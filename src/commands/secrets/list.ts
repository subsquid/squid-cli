import { ux as CliUx } from '@oclif/core';

import { listSecrets } from '../../api';
import { CliCommand, SqdFlags } from '../../command';

export default class Ls extends CliCommand {
  static aliases = ['secrets ls'];

  static description = 'List organization secrets in the Cloud';

  static examples = ['sqd secrets list --org my-org'];

  static flags = {
    org: SqdFlags.org({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { org, interactive },
      args: {},
    } = await this.parse(Ls);

    const organization = await this.promptOrganization(org, { interactive });
    const response = await listSecrets({ organization });

    if (!Object.keys(response.secrets).length) {
      return this.log('There are no secrets');
    }

    const values = Object.entries(response.secrets).map(([name, value]) => ({ name, value }));
    CliUx.ux.table(
      values,
      {
        name: {},
        value: {},
      },
      { 'no-truncate': false },
    );
  }
}
