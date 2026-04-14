import { Args } from '@oclif/core';

import { removeSecret } from '../../api';
import { CliCommand, SqdFlags } from '../../command';

export default class Rm extends CliCommand {
  static aliases = ['secrets rm'];

  static description = 'Delete an organization secret in the Cloud';

  static examples = ['sqd secrets remove DB_PASSWORD --org my-org'];

  static args = {
    name: Args.string({
      description: 'The secret name',
      required: true,
    }),
  };

  static flags = {
    org: SqdFlags.org({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { org, interactive },
      args: { name },
    } = await this.parse(Rm);

    const organization = await this.promptOrganization(org, { interactive });
    await removeSecret({ organization, name });

    this.logSuccess(` Secret '${name}' removed`);
  }
}
