import { ux as CliUx, Flags } from '@oclif/core';

import { listSecrets } from '../../api';
import { CliCommand } from '../../command';

export default class Ls extends CliCommand {
  static aliases = ['secrets ls'];

  static description = 'List organization secrets in the Cloud';

  static flags = {
    org: Flags.string({
      char: 'o',
      description: 'Organization',
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
