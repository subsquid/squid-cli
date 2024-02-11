import { Args, Flags } from '@oclif/core';

import { restartSquid } from '../api';
import { DeployCommand } from '../deploy-command';
import { parseNameAndVersion } from '../utils';

export default class Restart extends DeployCommand {
  static aliases = ['squid:redeploy', 'redeploy'];

  static description = 'Restart a squid deployed to the Cloud';
  static args = {
    nameAndVersion: Args.string({
      description: 'name@version',
      required: true,
    }),
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
  };

  async run(): Promise<void> {
    const {
      flags: { 'no-stream-logs': disableStreamLogs },
      args: { nameAndVersion },
    } = await this.parse(Restart);
    const { squidName, versionName } = parseNameAndVersion(nameAndVersion, this);

    const deploy = await restartSquid(squidName, versionName);

    await this.pollDeploy({ deployId: deploy.id, streamLogs: !disableStreamLogs });

    this.log('✔️ Done!');
  }
}
