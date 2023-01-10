import assert from 'assert';

import inquirer from 'inquirer';

import { getSquid, setProduction } from '../api';
import { CliCommand } from '../command';
import { parseNameAndVersion } from '../utils';

export default class Prod extends CliCommand {
  static aliases = ['squid:prod'];

  static summary = 'Assign a squid version to the production endpoint';
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
      this.log(`Cannot find a squid version "${versionName}". Please make sure the spelling is correct.`);
      return;
    }

    const { confirm } = await inquirer.prompt([
      {
        name: 'confirm',
        type: 'confirm',
        message: `Your squid "${foundSquid.name}" version "${
          foundSquid.versions[0].name
        }" will be assigned to the production endpoint ${inferProdUrl(
          foundSquid.versions[0].deploymentUrl,
          foundSquid.name,
        )}. Are you sure?`,
      },
    ]);
    if (!confirm) return;

    const squid = await setProduction(squidName, versionName);

    this.log(
      `The squid "${foundSquid.name}" is assigned to the production endpoint and will soon be available at ${squid.versions[0].deploymentUrl}.`,
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
