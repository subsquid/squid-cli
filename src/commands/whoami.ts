import { profile } from '../api/profile';
import { CliCommand } from '../command';
import { getConfig, getCurrentProfileName } from '../config';

export default class Whoami extends CliCommand {
  static description = `Show the user details for the current Cloud account`;

  static examples = ['sqd whoami'];

  async run(): Promise<void> {
    await this.parse(Whoami);

    const { username, email } = await profile();
    const { apiUrl, credentials } = getConfig();

    this.log(`Profile: ${getCurrentProfileName()}`);
    if (email) {
      this.log(`Email: ${email}`);
    }
    if (username) {
      this.log(`Username: ${username}`);
    }
    this.log(`API URL: ${apiUrl}`);
    const masked = credentials.length > 8 ? `${credentials.slice(0, 6)}...${credentials.slice(-4)}` : '****';
    this.log(`Token: ${masked}`);
  }
}
