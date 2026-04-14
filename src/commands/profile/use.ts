import { Args } from '@oclif/core';

import { CliCommand } from '../../command';
import { useProfile } from '../../config';

export default class ProfileUse extends CliCommand {
  static description = 'Switch the active profile';

  static examples = ['sqd profile use work', 'sqd profile use default'];

  static args = {
    name: Args.string({
      description: 'Profile name to switch to',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { name },
    } = await this.parse(ProfileUse);

    useProfile(name);

    this.log(`Switched to profile "${name}"`);
  }
}
