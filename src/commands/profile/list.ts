import { CliCommand } from '../../command';
import { getCurrentProfileName, getProfiles } from '../../config';

export default class ProfileList extends CliCommand {
  static description = 'List all saved profiles';

  static examples = ['sqd profile list'];

  async run(): Promise<void> {
    await this.parse(ProfileList);

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
      const masked =
        credentials.length > 8 ? `${credentials.slice(0, 6)}...${credentials.slice(-4)}` : '****';
      this.log(`${marker}${name}${isCurrent ? ' (current)' : ''}`);
      this.log(`    API URL : ${apiUrl}`);
      this.log(`    Token   : ${masked}`);
    }
  }
}
