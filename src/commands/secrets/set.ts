import { Args, Flags } from '@oclif/core';

import { setSecret } from '../../api';
import { CliCommand } from '../../command';

// TODO move to new API using put method

export default class Set extends CliCommand {
  static description = [
    'Add or update an organization secret in the Cloud. If value is not specified, it reads from standard input.',
    `The secret will be exposed as an environment variable with the given name to all the squids.`,
    `NOTE: The changes take affect only after a squid is restarted or updated.`,
  ].join('\n');

  static args = {
    name: Args.string({
      description: 'The secret name',
      required: true,
    }),
    value: Args.string({
      description: 'The secret value',
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
      args: { name, value },
    } = await this.parse(Set);

    const orgCode = await this.promptOrganization(org, 'using "-o" flag');

    let secretValue = value;
    if (!secretValue) {
      this.logQuestion('Reading plaintext input from stdin.');
      this.logDimmed('Use ctrl-d to end input, twice if secret does not have a newline. Ctrl+c to cancel');
      secretValue = await readFromStdin();
    }

    await setSecret({ name, value: secretValue, orgCode });

    this.logSuccess(`Set secret ${name} for organization ${orgCode}`);
  }
}

async function readFromStdin(): Promise<string> {
  let res = '';
  return await new Promise((resolve, reject) => {
    process.stdin.on('data', (data) => {
      res += data.toString('utf-8');
    });
    process.stdin.on('end', () => {
      resolve(res);
    });
    process.stdin.on('error', reject);
  });
}
