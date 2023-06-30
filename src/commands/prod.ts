import assert from 'assert';

import inquirer from 'inquirer';

import { getSquid, setProduction } from '../api';
import { DeployCommand } from '../deploy-command';
import { parseNameAndVersion } from '../utils';

export default class Prod extends DeployCommand {
  static aliases = ['squid:prod'];

  static description = 'Assign a squid version to the production endpoint';
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

    const foundSquid = await getSquid({ squidName, versionName });
    if (!foundSquid.versions?.length) {
      this.log(`Cannot find a squid version "${versionName}". Please make sure the spelling is correct.`);
      return;
    }

    const newUrl = inferProdUrl(foundSquid.versions[0].deploymentUrl, versionName);
    const { confirm } = await inquirer.prompt([
      {
        name: 'confirm',
        type: 'confirm',
        message: `Your squid "${squidName}@${versionName}" will be assigned to the production endpoint ${newUrl}. Are you sure?`,
      },
    ]);
    if (!confirm) return;

    const res = await setProduction(squidName, versionName);

    this.log(
      `The squid "${squidName}@${versionName}" is assigned to the production endpoint and will soon be available at ${res.versions[0].deploymentUrl}.`,
    );
  }
}

export function inferProdUrl(versionUrl: string, squidName: string): string {
  let base = versionUrl;
  if (versionUrl.indexOf('http') >= 0) {
    base = versionUrl.split('://')[1];
  }
  const split = base.split('/');

  assert(split.length >= 2);
  base = split[0];

  // https://api.subsquid.io/squid-name/graphql
  return `https://${base}/${squidName}/graphql`;
}
