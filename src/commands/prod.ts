import assert from 'assert';

import { Args, Flags } from '@oclif/core';
import inquirer from 'inquirer';

import { getSquid, setProduction } from '../api';
import { DeployCommand } from '../deploy-command';
import { parseNameAndVersion } from '../utils';

export default class Prod extends DeployCommand {
  static aliases = ['squid:prod'];

  static description = 'Assign the canonical production API alias for a squid deployed to the Cloud';
  static args = {
    nameAndVersion: Args.string({
      description: 'name@version',
      required: true,
    }),
  };
  static flags = {
    org: Flags.string({
      char: 'o',
      description: 'Organization',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args,
      flags: { org },
    } = await this.parse(Prod);

    const { squidName, versionName } = parseNameAndVersion(args.nameAndVersion, this);

    const orgCode = await this.promptSquidOrganization(org, squidName, 'using "-o" flag');

    const foundSquid = await getSquid({ orgCode, squidName, versionName });
    if (!foundSquid.versions?.length) {
      this.log(`Cannot find a squid version "${versionName}". Please make sure the spelling is correct.`);
      return;
    }

    const newUrl = inferProdUrl(foundSquid.versions[0].deploymentUrl, squidName);
    const { confirm } = await inquirer.prompt([
      {
        name: 'confirm',
        type: 'confirm',
        message: `Your squid "${squidName}@${versionName}" will be assigned to the production endpoint ${newUrl}. Are you sure?`,
      },
    ]);
    if (!confirm) return;

    const res = await setProduction({ orgCode, squidName, versionName });

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
