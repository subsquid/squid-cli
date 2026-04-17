import { Args } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';

import { CliCommand } from '../../command';
import { getCurrentProfileName, getProfiles, useProfile } from '../../config';
import { getTTY } from '../../tty';

export default class ProfileUse extends CliCommand {
  static description = 'Switch the active profile';

  static examples = ['sqd profile use', 'sqd profile use work'];

  static args = {
    name: Args.string({
      description: 'Profile name to switch to',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { name: argName },
      flags: { interactive },
    } = await this.parse(ProfileUse);

    const profiles = getProfiles();
    const current = getCurrentProfileName();
    const choices = Object.keys(profiles).filter((n) => n !== current);

    this.log(`${chalk.dim('Current profile:')} ${chalk.bold(current)}`);

    if (choices.length === 0) {
      return this.log(
        chalk.yellow(`No other profiles available. Use "sqd auth -k <key> --profile <name>" to create one.`),
      );
    }

    let name = argName;

    if (!name) {
      const { stdin, stdout } = getTTY();
      if (!stdin || !stdout || !interactive) {
        return this.error(
          [
            `Please specify a profile name.`,
            `Available profiles: ${choices.join(', ')}`,
            ``,
            `Example: sqd profile use ${choices[0]}`,
          ].join('\n'),
        );
      }

      const prompt = inquirer.createPromptModule({ input: stdin, output: stdout });
      const answer = await prompt([
        {
          name: 'profile',
          type: 'list',
          message: 'Switch to profile:',
          choices,
        },
      ]);
      stdin.destroy();
      stdout.destroy();
      name = answer.profile as string;
    }

    useProfile(name!);
    this.logSuccess(` Switched to profile ${chalk.bold(name)}`);
  }
}
