import { Flags, Args } from '@oclif/core';

import { removeSecret } from '../../api';
import { CliCommand } from '../../command';

export default class Rm extends CliCommand {
  static description = 'Delete a secret in the Cloud';
  static args = {
    name: Args.string({
      description: 'The secret name',
      required: true,
    }),
  };

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
      args: { name },
    } = await this.parse(Rm);

    const orgCode = await this.promptOrganization(org, 'using "-o" flag');
    await removeSecret({ name, orgCode });

    this.log(`Secret '${name}' removed`);
  }
}
