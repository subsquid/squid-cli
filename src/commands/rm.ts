import { CliUx, Command, Flags } from '@oclif/core';
import inquirer from 'inquirer';

import { destroySquid, destroyVersion } from '../api';
import { parseNameAndVersion } from '../utils';

export default class Rm extends Command {
  static aliases = ['squid:kill', 'kill'];

  static description = 'Remove a squid or a squid version deployed to the Cloud';
  static args = [
    {
      name: 'nameAndVersion',
      description: '<name> or <name@version>',
      required: true,
    },
  ];
  static flags = {
    force: Flags.boolean({
      char: 'f',
      description: 'Does not prompt before removing a squid or its version',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { nameAndVersion },
      flags: { force },
    } = await this.parse(Rm);

    if (nameAndVersion.includes('@')) {
      const { squidName, versionName } = parseNameAndVersion(nameAndVersion, this);

      if (!force) {
        const { confirm } = await inquirer.prompt([
          {
            name: 'confirm',
            type: 'confirm',
            message: `Your squid "${squidName}" version "${versionName}" will be completely removed. This action can not be undone. Are you sure?`,
          },
        ]);
        if (!confirm) return;
      }

      CliUx.ux.action.start('◷ Deleting version');
      this.log(await destroyVersion(squidName, versionName));
      CliUx.ux.action.stop();
      return;
    }

    if (!force) {
      const { confirm } = await inquirer.prompt([
        {
          name: 'confirm',
          type: 'confirm',
          message: `Your squid "${nameAndVersion}" will be completely removed. This action can not be undone. Are you sure?`,
        },
      ]);
      if (!confirm) return;
    }

    CliUx.ux.action.start('◷ Deleting squid');
    this.log(await destroySquid(nameAndVersion));
    CliUx.ux.action.stop();
  }
}
