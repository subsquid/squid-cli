import { me } from '../api/me';
import { CliCommand } from '../command';
import { getConfig } from '../config';

export default class Whoami extends CliCommand {
  static summary = `Return user and context`;

  async run(): Promise<void> {
    await this.parse(Whoami);

    const { username } = await me();
    const { apiUrl, credentials } = getConfig();

    this.log(`Username: ${username}`);
    this.log(`API URL: ${apiUrl}`);
    this.log(`Token: ${credentials}`);
  }
}
