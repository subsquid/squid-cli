import { CliUx, Command } from '@oclif/core';

import { destroyApp, destroyDeployment } from '../../rest-client/routes/destroy';
import { parseNameAndVersion } from '../../utils';

export default class Kill extends Command {
  static description = 'Kill a squid or a squid version';
  static args = [
    {
      name: 'nameAndVersion',
      description: '<name> or <name@version>',
      required: true,
    },
  ];

  async run(): Promise<void> {
    const { flags, args } = await this.parse(Kill);
    const params: string = args.nameAndVersion;
    let message;

    if (params.includes('@')) {
      const { squidName, versionName } = parseNameAndVersion(params, this);
      CliUx.ux.action.start('◷ Deleting version');
      message = await destroyDeployment(squidName, versionName);
    } else {
      CliUx.ux.action.start('◷ Deleting squid');
      message = await destroyApp(params);
    }
    CliUx.ux.action.stop();

    this.log(message);
  }
}
