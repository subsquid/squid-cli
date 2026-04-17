import { profile } from '../api/profile';
import { CliCommand } from '../command';
import { getConfig } from '../config';

export default class Whoami extends CliCommand {
  static description = `Show the user details for the current Cloud account`;

  static examples = ['sqd whoami'];

  async run(): Promise<void> {
    await this.parse(Whoami);

    const { username, email } = await profile();
    const { apiUrl, credentials } = getConfig();

    if (email) {
      this.log(`Email: ${email}`);
    }
    if (username) {
      this.log(`Username: ${username}`);
    }
    this.log(`API URL: ${apiUrl}`);
    this.log(`Token: ${'*'.repeat(Math.max(0, credentials.length - 4))}${credentials.slice(-4)}`);
  }
}
