import { Flags } from '@oclif/core';

import { setSecret } from '../../api';
import { CliCommand } from '../../command';

// TODO move to new API using put method

export default class Set extends CliCommand {
  static description = [
    'Create or update a secret',
    `The secret will be exposed as an environment variable with the given name to all the squids.`,
    `NOTE: The changes take affect only after a squid is restarted or updated.`,
  ].join('\n');

  static args = [
    {
      name: 'name',
      description: 'The secret name',
      required: true,
    },
    {
      name: 'value',
      description: 'The secret value',
      required: true,
    },
  ];
  static flags = {
    projectCode: Flags.string({
      char: 'p',
      description: 'Project',
      required: false,
      hidden: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { projectCode },
      args: { name, value },
    } = await this.parse(Set);

    await setSecret({ name, value, projectCode });

    this.log(`Secret '${name}' set`);
  }
}
