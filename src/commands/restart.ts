import { Args, Flags } from '@oclif/core';
import chalk from 'chalk';

import { restartSquid } from '../api';
import { SquidNameArg } from '../command';
import { DeployCommand } from '../deploy-command';
import { parseSquidName } from '../utils';

import { UPDATE_COLOR } from './deploy';

export default class Restart extends DeployCommand {
  static aliases = ['squid:redeploy', 'redeploy'];

  static description = 'Restart a squid deployed to the Cloud';
  static args = {
    squidName: SquidNameArg,
  };

  static flags = {
    env: Flags.string({
      char: 'e',
      description: 'environment variable',
      required: false,
      deprecated: true,
      multiple: true,
      hidden: true,
    }),
    envFile: Flags.string({
      description: 'file with environment variables',
      deprecated: true,
      required: false,
      hidden: true,
    }),
    'no-stream-logs': Flags.boolean({
      description: 'Do not attach and stream squid logs after the deploy',
      required: false,
      default: false,
    }),
    org: Flags.string({
      char: 'o',
      description: 'Organization',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { 'no-stream-logs': disableStreamLogs, org },
      args: { squidName },
    } = await this.parse(Restart);

    const filter = parseSquidName(squidName);

    const organization = await this.promptSquidOrganization(org, filter.name, 'using "-o" flag');
    const squid = await this.findOrThrowSquid({ organization, ...filter });

    const deploy = await restartSquid({ organization, squid });
    await this.pollDeploy({ organization, deploy });

    this.log(
      [
        '',
        chalk[UPDATE_COLOR](`=================================================`),
        `The squid ${squid.name}#${squid.slot} has been successfully restarted`,
        chalk[UPDATE_COLOR](`=================================================`),
      ].join('\n'),
    );
  }
}
