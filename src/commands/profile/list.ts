import { Flags } from '@oclif/core';

import { profile as fetchProfile } from '../../api/profile';
import { CliCommand } from '../../command';
import { getCurrentProfileName, getProfiles } from '../../config';

export default class ProfileList extends CliCommand {
  static description = 'List all saved profiles';

  static examples = ['sqd profile list', 'sqd profile list --show-token'];

  static flags = {
    'show-token': Flags.boolean({
      description: 'Show full auth tokens',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { 'show-token': showToken },
    } = await this.parse(ProfileList);

    const profiles = getProfiles();
    const current = getCurrentProfileName();
    const names = Object.keys(profiles);

    if (names.length === 0) {
      this.log('No profiles found. Use "sqd auth -k <key>" to log in.');
      return;
    }

    for (const name of names) {
      const { apiUrl, credentials } = profiles[name];
      const isCurrent = name === current;
      const marker = isCurrent ? '* ' : '  ';

      this.log(`${marker}${name}${isCurrent ? ' (current)' : ''}`);
      this.log(`    API URL  : ${apiUrl}`);

      try {
        const { email, username } = await fetchProfile({ auth: { apiUrl, credentials } });
        if (email) this.log(`    Email    : ${email}`);
        if (username) this.log(`    Username : ${username}`);
      } catch {
        this.log(`    (unable to fetch user info)`);
      }

      if (showToken) {
        this.log(`    Token    : ${credentials}`);
      }
    }
  }
}
