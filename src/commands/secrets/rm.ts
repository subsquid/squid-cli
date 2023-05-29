import { Flags } from '@oclif/core';

import { removeSecret } from '../../api';
import { CliCommand } from '../../command';
import { chooseProjectIfRequired } from '../projects';

export default class Rm extends CliCommand {
  static description = 'Remove a secret';
  static args = [
    {
      name: 'name',
      description: 'The secret name',
      required: true,
    },
  ];
  static flags = {
    project: Flags.string({
      char: 'p',
      description: 'Project',
      required: false,
      hidden: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { projectCode: project },
      args: { name },
    } = await this.parse(Rm);

    const projectCode = await chooseProjectIfRequired(project);
    await removeSecret({ name, projectCode });

    this.log(`Secret '${name}' removed`);
  }
}
