import { Args, ux as CliUx, Flags } from '@oclif/core';
import inquirer from 'inquirer';

import { destroySquid, destroyVersion } from '../api';
import { DeployCommand } from '../deploy-command';
import { parseNameAndVersion } from '../utils';

export default class Rm extends DeployCommand {
  static aliases = ['squid:kill', 'kill'];

  static description = 'Remove a squid or a squid version deployed to the Cloud';

  static args = {
    nameAndVersion: Args.string({
      description: '<name> or <name@version>',
      required: true,
    }),
  };

  static flags = {
    force: Flags.boolean({
      char: 'f',
      description: 'Does not prompt before removing a squid or its version',
      required: false,
    }),
    org: Flags.string({
      char: 'o',
      description: 'Organization',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { nameAndVersion },
      flags: { force, org },
    } = await this.parse(Rm);

    if (nameAndVersion.includes('@')) {
      const { squidName, versionName } = parseNameAndVersion(nameAndVersion, this);

      const orgCode = await this.promptSquidOrganization(org, squidName, 'using "-o" flag');

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
      this.log(await destroyVersion({ orgCode, squidName, versionName }));
      CliUx.ux.action.stop();
      return;
    } else {
      const orgCode = await this.promptSquidOrganization(org, nameAndVersion, 'using "-o" flag');

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
      this.log(await destroySquid({ orgCode, squidName: nameAndVersion }));
      CliUx.ux.action.stop();
    }
  }
}
