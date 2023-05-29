import { profile } from '../api/profile';
import { CliCommand } from '../command';
import { getConfig } from '../config';

export default class Whoami extends CliCommand {
  static description = `Return user and context`;

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
    this.log(`Token: ${credentials}`);
  }
}
