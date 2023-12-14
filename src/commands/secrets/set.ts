import { readFileSync } from 'fs';

import { Flags } from '@oclif/core';

import { setSecret, promptOrganization } from '../../api';
import { CliCommand } from '../../command';

// TODO move to new API using put method

export default class Set extends CliCommand {
  static description = [
    'Create or update a secret. If value is not specified, reads from stadard input.',
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
      required: false,
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
      args: { name, value },
    } = await this.parse(Set);

    const organization = await promptOrganization(org);

    let v = value;
    if (!v) {
      v = readFileSync(process.stdin.fd).toString();
    }

    await setSecret({ name, value: v, organization });

    this.log(`Secret '${name}' set`);
  }
}
