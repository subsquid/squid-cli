import { Flags } from '@oclif/core';

import { profile } from '../api/profile';
import { CliCommand } from '../command';
import { DEFAULT_API_URL, setConfig } from '../config';

export default class Auth extends CliCommand {
  static description = `Authenticate to deploy and manage squids`;

  static flags = {
    key: Flags.string({
      char: 'k',
      description: 'Aquarium deployment key. Log in to https://app.subsquid.io to create or update your key.',
      required: true,
    }),
    host: Flags.string({
      char: 'h',
      hidden: true,
      default: DEFAULT_API_URL,
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { key, host },
    } = await this.parse(Auth);

    const { username, email } = await profile({
      auth: {
        apiUrl: host,
        credentials: key,
      },
    });

    setConfig(key, host);

    this.log(`Successfully logged as ${email || username}`);
  }
}
