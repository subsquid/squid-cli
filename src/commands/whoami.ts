import { profile } from '../api/profile';
import { CliCommand } from '../command';
import { getConfig, getCurrentProfileName } from '../config';

export default class Whoami extends CliCommand {
  static description = `Show the user details for the current Cloud account`;

  static examples = ['sqd whoami'];

  async run(): Promise<void> {
    await this.parse(Whoami);

    const { username, email } = await profile();
    const { apiUrl } = getConfig();

    this.log(`Profile: ${getCurrentProfileName()}`);
    if (email) {
      this.log(`Email: ${email}`);
    }
    if (username) {
      this.log(`Username: ${username}`);
    }
    this.log(`API URL: ${apiUrl}`);
  }
}
