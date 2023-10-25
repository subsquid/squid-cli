import { CliUx, Flags } from '@oclif/core';

import { listSecrets, promptOrganization } from '../../api';
import { CliCommand } from '../../command';

export default class Ls extends CliCommand {
  static description = 'List secrets set in the Cloud';
  static args = [];
  static flags = {
    org: Flags.string({
      char: 'o',
      description: 'Organization',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { org },
      args: {},
    } = await this.parse(Ls);

    const organization = await promptOrganization(org);
    const response = await listSecrets({ organization });

    if (!Object.keys(response.secrets).length) {
      return this.log('There are no secrets');
    }

    const values: { name: string; value: string }[] = [];
    for (const secret in response.secrets) {
      values.push({ name: secret, value: response.secrets[secret] });
    }
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
