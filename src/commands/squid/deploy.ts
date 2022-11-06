import { CliUx, Flags } from '@oclif/core';
import { dim, red, yellow } from 'chalk';

import { DeployResponse, deploySquid, DeployStatus, getDeploy, streamSquidLogs } from '../../api';
import { CliCommand } from '../../command';
import { doUntil } from '../../utils';

export default class Deploy extends CliCommand {
  static description = 'Deploy a new squid version';

  static flags = {
    github: Flags.string({
      char: 'g',
      description: 'A fully qualified git url, e.g. https://github.com/squidlover/my-squid.git#v5',
      required: true,
    }),
    hardReset: Flags.boolean({
      char: 'r',
      description: 'Perform a hard reset (db wipeout)',
      required: false,
    }),
  };

  deploy: DeployResponse | undefined;
  logsPrinted = 0;

  async run(): Promise<void> {
    const {
      flags: { hardReset, github },
    } = await this.parse(Deploy);

    this.log(`🦑 Releasing the squid`);
    const deploy = await deploySquid({
      hardReset,
      artifactUrl: github,
    });
    this.log(
      '◷ You may now detach from the build process by pressing Ctrl + C. The Squid deployment will continue uninterrupted.',
    );
    this.log('◷ The new squid will be available as soon as the deployment is complete.');
    await this.pollDeploy(deploy);
    this.log('✔️ Done!');
  }

  async pollDeploy(deploy: DeployResponse): Promise<void> {
    let lastStatus: string;

    await doUntil(
      async () => {
        this.deploy = await getDeploy(deploy.id);

        if (!this.deploy) return true;
        if (this.deploy.status !== lastStatus) {
          lastStatus = this.deploy.status;
          CliUx.ux.action.stop('✔️');
        }

        this.printDebug();

        switch (this.deploy.status) {
          case DeployStatus.UNPACKING:
            CliUx.ux.action.start('◷ Preparing your squid');
            if (this.deploy.failed) return this.showError(`❌ An error occurred while building the squid`);

            return false;
          case DeployStatus.RESETTING:
            CliUx.ux.action.start('◷ Resetting squid');
            if (this.deploy.failed) return this.showError(`❌ An error occurred while resetting the squid`);

            return false;
          case DeployStatus.IMAGE_BUILDING:
            CliUx.ux.action.start('◷ Building your squid');
            if (this.deploy.failed) return this.showError(`❌ An error occurred while building the squid`);

            return false;
          case DeployStatus.IMAGE_PUSHING:
            CliUx.ux.action.start('◷ Publishing your squid');
            if (this.deploy.failed) return this.showError(`❌ An error occurred while publishing the squid`);

            return false;
          case DeployStatus.DEPLOYING:
            CliUx.ux.action.start('◷ Deploying your squid');
            if (this.deploy.failed) return this.showError(`❌ An error occurred while deploying the squid`);

            return false;
          case DeployStatus.OK:
            this.log(`Squid is running up. Your squid will be shortly available at ${this.deploy.deploymentUrl}`);

            if (this.deploy.squidName && this.deploy.versionName) {
              CliUx.ux.action.start(`Streaming logs from the squid`);
              await streamSquidLogs(this.deploy.squidName, this.deploy.versionName, (l) => this.log(l));
            }

            return true;
          default:
            /**
             * Just wait if some unexpected status has been received.
             * This behavior is more safe for forward compatibility
             */
            return false;
        }
      },
      { pause: 3000 },
    );
  }
  printDebug = () => {
    if (!this.deploy) return;

    const logs = this.deploy.logs.slice(this.logsPrinted);
    if (logs.length === 0) return;

    this.logsPrinted += logs.length;

    logs
      .filter((v) => v)
      .forEach(({ severity, message }) => {
        switch (severity) {
          case 'error':
            this.log(red(message));
            return;
          default:
            this.log(dim(message));
        }
      });
  };

  showError(text: string): boolean {
    this.error(
      [
        text,
        `------`,
        'Please report to Discord https://discord.gg/KRvRcBdhEE or SquidDevs https://t.me/HydraDevs',
        `${dim('Deploy:')} ${this.deploy?.id}`,
        this.deploy?.squidName ? `${dim('Squid:')} ${this.deploy?.squidName}` : null,
        this.deploy?.versionName ? `${dim('Version:')} ${this.deploy?.versionName}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    );

    return true;
  }
}
