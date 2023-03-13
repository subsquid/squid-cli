import { Flags } from '@oclif/core';

import { redeploySquid } from '../api';
import { DeployCommand } from '../deploy-command';
import { parseEnvs, parseNameAndVersion } from '../utils';

export default class Redeploy extends DeployCommand {
  static aliases = ['squid:redeploy'];

  static description = 'Restart a squid version';
  static args = [
    {
      name: 'nameAndVersion',
      description: 'name@version',
      required: true,
    },
  ];
  static flags = {
    env: Flags.string({
      char: 'e',
      description: 'environment variable',
      required: false,
      deprecated: true,
      multiple: true,
    }),
    envFile: Flags.string({
      description: 'file with environment variables',
      deprecated: true,
      required: false,
    }),
    'no-stream-logs': Flags.boolean({
      description: 'Do not attach and stream squid logs after the deploy',
      required: false,
      default: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags,
      args: { nameAndVersion, 'no-stream-logs': disableStreamLogs },
    } = await this.parse(Redeploy);
    const { squidName, versionName } = parseNameAndVersion(nameAndVersion, this);

    const envs = parseEnvs(flags.env, flags.envFile);

    const deploy = await redeploySquid(squidName, versionName, envs);

    await this.pollDeploy(deploy, { streamLogs: !disableStreamLogs });

    this.log('✔️ Done!');
  }
}
