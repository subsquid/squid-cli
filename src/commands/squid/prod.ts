import inquirer from 'inquirer';

import { getSquid } from '../../api';
import { setProduction } from '../../api/alias';
import { CliCommand } from '../../command';
import { parseNameAndVersion } from '../../utils';

export default class Prod extends CliCommand {
  static description = 'Promote version to production';
  static hidden = true;
  static args = [
    {
      name: 'nameAndVersion',
      description: 'name@version',
      required: true,
    },
  ];

  async run(): Promise<void> {
    const { args } = await this.parse(Prod);

    const { squidName, versionName } = parseNameAndVersion(args.nameAndVersion, this);

    const foundSquid = await getSquid(squidName, versionName);
    if (!foundSquid.versions.length) {
      this.log(
        `Squid "${squidName}" does not have "${versionName}" version. Please make sure the spelling is correct.`,
      );
      return;
    }

    const { confirm } = await inquirer.prompt([
      {
        name: 'confirm',
        type: 'confirm',
        message: `Your squid "${foundSquid.name}" version "${foundSquid.versions[0].name}" will be promoted to a production. Are you sure?`,
      },
    ]);
    if (!confirm) return;

    const squid = await setProduction(squidName, versionName);

    this.log(`Your squid is promoted to production and will be accessible soon at ${squid.versions[0].deploymentUrl}.`);
  }
}
