import { Command } from '@oclif/core';
import chalk from 'chalk';

export default class Prod extends Command {
  static hidden = true;

  static description = 'Assign the canonical production API alias for a squid deployed to the Cloud';

  async run(): Promise<void> {
    await this.parse(Prod);

    // TODO write description
    this.log(
      [
        chalk.yellow('*******************************************************'),
        chalk.yellow('*                                                     *'),
        chalk.yellow('* WARNING! This command has been deprecated           *'),
        chalk.yellow('* Please check the release notes                      *'),
        chalk.yellow('* https://docs.sqd.dev/deployments-two-release-notes/ *'),
        chalk.yellow('*                                                     *'),
        chalk.yellow('*******************************************************'),
      ].join('\n'),
    );
  }
}
