import { Flags } from '@oclif/core';

import { profile } from '../api/profile';
import { CliCommand } from '../command';
import { DEFAULT_API_URL, setConfig } from '../config';

export default class Auth extends CliCommand {
  static description = `Log in to the Cloud`;

  static examples = ['sqd auth -k sqd_xyz123...', 'sqd auth -k sqd_xyz123... --profile work'];

  static flags = {
    key: Flags.string({
      char: 'k',
      description: 'Cloud auth key. Log in to https://app.subsquid.io to create or update your key.',
      required: true,
    }),
    profile: Flags.string({
      char: 'p',
      description: 'Profile name to save credentials under. Defaults to the current active profile.',
      required: false,
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
      flags: { key, host, profile: profileName },
    } = await this.parse(Auth);

    const { username, email } = await profile({
      auth: {
        apiUrl: host,
        credentials: key,
      },
    });

    setConfig(key, host, profileName);

    const savedAs = profileName ? ` (profile: ${profileName})` : '';
    this.log(`Successfully logged as ${email || username}${savedAs}`);
  }
}
