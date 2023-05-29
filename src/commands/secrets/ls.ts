import { CliUx, Flags } from '@oclif/core';

import { listSecrets } from '../../api';
import { CliCommand } from '../../command';

export default class Ls extends CliCommand {
  static description = 'List all secrets for the current Aquarium account';
  static args = [];
  static flags = {
    project: Flags.string({
      char: 'p',
      description: 'Project',
      required: false,
      hidden: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { project },
      args: {},
    } = await this.parse(Ls);
    const response = await listSecrets({ projectCode: project });
    if (Object.keys(response.secrets).length) {
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
    } else {
      this.log('There are no secrets');
    }
  }
}
