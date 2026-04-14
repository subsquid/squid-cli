import { Args } from '@oclif/core';

import { CliCommand } from '../../command';
import { removeProfile } from '../../config';

export default class ProfileRemove extends CliCommand {
  static description = 'Remove a saved profile';

  static examples = ['sqd profile remove work'];

  static args = {
    name: Args.string({
      description: 'Profile name to remove',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { name },
    } = await this.parse(ProfileRemove);

    removeProfile(name);

    this.log(`Profile "${name}" has been removed`);
  }
}
