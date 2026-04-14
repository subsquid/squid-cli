import chalk from 'chalk';

import { profile } from '../api/profile';
import { CliCommand } from '../command';
import { getConfig } from '../config';

function field(label: string, value: string) {
  return `${chalk.dim(label.padEnd(10))}${value}`;
}

export default class Whoami extends CliCommand {
  static description = `Show the user details for the current Cloud account`;

  static examples = ['sqd whoami'];

  async run(): Promise<void> {
    await this.parse(Whoami);

    const { username, email } = await profile();
    const { apiUrl } = getConfig();

    if (email) this.log(field('Email', email));
    if (username) this.log(field('Username', username));
    this.log(field('API URL', apiUrl));
  }
}
