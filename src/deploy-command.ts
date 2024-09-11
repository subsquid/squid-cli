import { ux as CliUx } from '@oclif/core';
import chalk, { ForegroundColor } from 'chalk';
import inquirer from 'inquirer';

import { Deployment, DeployRequest, getDeploy, Organization, Squid, SquidRequest, streamSquidLogs } from './api';
import { CliCommand, SUCCESS_CHECK_MARK } from './command';
import { doUntil, formatSquidReference, printSquid } from './utils';

export abstract class DeployCommand extends CliCommand {
  deploy: Deployment | undefined;
  logsPrinted = 0;

  async promptAttachToDeploy(squid: Squid, { interactive }: { interactive?: boolean } = {}) {
    if (!squid.lastDeploy) return false;
    if (squid.status !== 'DEPLOYING') return false;

    const warning = `Squid ${printSquid(squid)} is being deploying. 
You can not run deploys on the same squid in parallel`;

    if (!interactive) {
      this.error(warning);
    }

    this.warn(warning);

    switch (squid.lastDeploy.type) {
      // we should react only for running deploy
      case 'DEPLOY':
        const { confirm } = await inquirer.prompt([
          {
            name: 'confirm',
            type: 'confirm',
            message: `Do you want to attach to the running deploy process?`,
          },
        ]);
        if (!confirm) return false;

        if (squid.organization) {
          await this.pollDeploy({
            organization: squid.organization,
            deploy: squid.lastDeploy,
            streamLogs: true,
          });
        }

        return true;
    }
  }

  async promptAddTag(
    { organization, name, tag }: { organization: Pick<Organization, 'code'>; name: string; tag: string },
    { using = 'using "--force" flag', interactive }: { using?: string; interactive?: boolean } = {},
  ) {
    const oldSquid = await this.findSquid({
      organization,
      squid: { name, tag },
    });
    if (!oldSquid) return true;

    const warning = `A tag "${tag}" has already been assigned to ${printSquid(oldSquid)}.`;

    if (!interactive) {
      this.error([warning, `Please do it explicitly ${using}`].join('\n'));
    }

    this.warn(warning);

    const { confirm } = await inquirer.prompt([
      {
        name: 'confirm',
        type: 'confirm',
        message: 'Are you sure?',
        prefix: `The tag will be assigned to the newly created squid.`,
      },
    ]);

    return !!confirm;
  }

  async pollDeploy({
    deploy,
    organization,
  }: DeployRequest & { streamLogs?: boolean }): Promise<Deployment | undefined> {
    let lastStatus: string;
    let validatedPrinted = false;

    await doUntil(
      async () => {
        this.deploy = await getDeploy({ deploy, organization });

        if (!this.deploy) return true;

        this.printDebug();

        if (this.isFailed()) return this.showError(`An error occurred while deploying the squid`);
        if (this.deploy.status === lastStatus) return false;
        lastStatus = this.deploy.status;
        CliUx.ux.action.stop(SUCCESS_CHECK_MARK);

        switch (this.deploy.status) {
          case 'UNPACKING':
            CliUx.ux.action.start('◷ Preparing the squid');

            return false;
          case 'RESETTING':
            CliUx.ux.action.start('◷ Resetting the squid');

            return false;
          case 'IMAGE_BUILDING':
            CliUx.ux.action.start('◷ Building the squid');

            if (!validatedPrinted) {
              this.log(
                '◷ You may now detach from the build process by pressing Ctrl + C. The Squid deployment will continue uninterrupted.',
              );
              this.log('◷ The new squid will be available as soon as the deployment is complete.');
              validatedPrinted = true;
            }

            return false;
          case 'SQUID_DELETING':
            CliUx.ux.action.start('◷ Deleting the squid');

            return false;
          case 'ADDONS_DELETING':
            CliUx.ux.action.start('◷ Deleting the squid addons');

            return false;
          case 'DEPLOYING':
          case 'SQUID_SYNCING':
            CliUx.ux.action.start('◷ Deploying the squid');

            return false;
          case 'ADDONS_SYNCING':
            CliUx.ux.action.start('◷ Syncing the squid addons');

            return false;
          case 'ADDING_INGRESS':
          case 'REMOVING_INGRESS':
            CliUx.ux.action.start('◷ Configuring ingress');

            return false;
          case 'OK':
            this.log(`Done! ${SUCCESS_CHECK_MARK}`);

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

    return this.deploy;
  }

  async streamLogs({ organization, squid }: SquidRequest) {
    CliUx.ux.action.start(`Streaming logs from the squid`);

    await streamSquidLogs({
      organization,
      squid,
      onLog: (l) => this.log(l),
    });
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
          case 'info':
            this.log(chalk.cyan(message));
            return;
          case 'warn':
            this.log(chalk.yellow(message));
            return;
          case 'error':
            this.log(chalk.red(message));
            return;
          default:
            this.log(chalk.dim(message));
        }
      });
  };

  showError(text: string, reason?: string): never {
    CliUx.ux.action.stop('❌');

    reason = reason || this.deploy?.failed || 'UNEXPECTED';
    const errors: (string | null)[] = [text];
    if (reason === 'UNEXPECTED') {
      errors.push(
        `------`,
        'Please report to Discord https://discord.gg/KRvRcBdhEE or SquidDevs https://t.me/HydraDevs',
        `${chalk.dim('Deploy:')} ${this.deploy?.id}`,
      );

      if (this.deploy?.squid) {
        errors.push(`${chalk.dim('Squid:')} ${formatSquidReference(this.deploy.squid)}`);
      }
    }

    // FIXME: maybe we should send an error report ourselves here with more details?
    this.error(errors.filter(Boolean).join('\n'));
  }

  isFailed() {
    if (!this.deploy) return true;

    return this.deploy.failed !== 'NO';
  }

  logDeployResult(color: typeof ForegroundColor, message: string) {
    this.log(
      [
        '',
        chalk[color](`=================================================`),
        message,
        chalk[color](`=================================================`),
        '',
      ].join('\n'),
    );
  }
}
