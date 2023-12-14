import { Flags } from '@oclif/core';

import { removeSecret } from '../../api';
import { CliCommand } from '../../command';

export default class Rm extends CliCommand {
  static description = 'Remove a secret';
  static args = [
    {
      name: 'name',
      description: 'The secret name',
      required: true,
    },
  ];
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

    const organization = await this.promptOrganization(org);
    await removeSecret({ name, organization });

    this.log(`Secret '${name}' removed`);
  }
}
