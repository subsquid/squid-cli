import { Flags } from '@oclif/core';

import { restartSquid } from '../api';
import { SquidReferenceArg } from '../command';
import { DeployCommand } from '../deploy-command';

import { UPDATE_COLOR } from './deploy';

export default class Restart extends DeployCommand {
  static description = 'Restart a squid deployed to the Cloud';
  static args = {
    squid_reference: SquidReferenceArg,
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
      flags: { org },
      args: { squid_reference: reference },
    } = await this.parse(Restart);

    const organization = await this.promptSquidOrganization({ code: org, reference });

    await this.findOrThrowSquid({ organization, reference });

    const deploy = await restartSquid({ organization, reference });
    await this.pollDeploy({ organization, deploy });

    this.logDeployResult(UPDATE_COLOR, `The squid ${reference} has been successfully restarted`);
  }
}
