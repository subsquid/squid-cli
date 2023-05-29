import { CliUx, Flags } from '@oclif/core';

import { listSecrets, chooseProjectIfRequired } from '../../api';
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

    const projectCode = await chooseProjectIfRequired(project);
    const response = await listSecrets({ projectCode });

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
