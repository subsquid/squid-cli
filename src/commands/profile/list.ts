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
      const marker = name === current ? '* ' : '  ';
      this.log(`${marker}${name}`);
      this.log(`    API URL : ${apiUrl}`);
      this.log(`    Token   : ${credentials}`);
    }
  }
}
