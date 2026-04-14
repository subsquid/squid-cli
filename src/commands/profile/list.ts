import { Flags } from '@oclif/core';
import chalk from 'chalk';

import { profile as fetchProfile } from '../../api/profile';
import { CliCommand } from '../../command';
import { getCurrentProfileName, getProfiles } from '../../config';

function field(label: string, value: string) {
  return `  ${chalk.dim(label.padEnd(10))}${value}`;
}

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

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const { apiUrl, credentials } = profiles[name];
      const isCurrent = name === current;

      const marker = isCurrent ? chalk.green('❯ ') : '  ';
      const heading = isCurrent ? chalk.bold(name) : name;
      this.log(`${marker}${heading}`);
      this.log(field('API URL', apiUrl));

      try {
        const { email, username } = await fetchProfile({ auth: { apiUrl, credentials } });
        if (email) this.log(field('Email', email));
        if (username) this.log(field('Username', username));
      } catch {
        this.log(`  ${chalk.dim('(invalid credentials)')}`);
      }

      if (showToken) {
        this.log(field('Token', credentials));
      }

      if (i < names.length - 1) this.log('');
    }
  }
}
