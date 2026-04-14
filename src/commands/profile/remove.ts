import { Args } from '@oclif/core';
import inquirer from 'inquirer';

import { CliCommand } from '../../command';
import { getCurrentProfileName, getProfiles, removeProfile } from '../../config';
import { getTTY } from '../../tty';

export default class ProfileRemove extends CliCommand {
  static description = 'Remove a saved profile';

  static examples = ['sqd profile remove', 'sqd profile remove work'];

  static args = {
    name: Args.string({
      description: 'Profile name to remove',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { name: argName },
      flags: { interactive },
    } = await this.parse(ProfileRemove);

    const profiles = getProfiles();
    const current = getCurrentProfileName();
    const choices = Object.keys(profiles).filter((n) => n !== current);

    if (choices.length === 0) {
      return this.log(`No removable profiles. The active profile "${current}" cannot be removed.`);
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
            `Example: sqd profile remove ${choices[0]}`,
          ].join('\n'),
        );
      }

      const prompt = inquirer.createPromptModule({ input: stdin, output: stdout });
      const answer = await prompt([
        {
          name: 'profile',
          type: 'list',
          message: 'Remove profile:',
          choices,
        },
      ]);
      stdin.destroy();
      stdout.destroy();
      name = answer.profile as string;
    }

    removeProfile(name!);
    this.log(`Profile "${name}" has been removed`);
  }
}
