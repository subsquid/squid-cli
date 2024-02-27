import { Command } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { isNil } from 'lodash';

import { ApiError, SquidOrganizationResponse, listOrganizations, listSquids } from './api';
import { getTTY } from './tty';

export const RELEASE_DEPRECATE = [
  chalk.yellow('*******************************************************'),
  chalk.yellow('*                                                     *'),
  chalk.yellow('* WARNING! This command has been deprecated           *'),
  chalk.yellow('* Please check the migration guide                    *'),
  chalk.yellow('* https://docs.subsquid.io/deploy-squid/migration/    *'),
  chalk.yellow('*                                                     *'),
  chalk.yellow('*******************************************************'),
].join('\n');

export abstract class CliCommand extends Command {
  logSuccess(message: string) {
    this.log(chalk.green(`✓ `) + message);
  }

  logQuestion(message: string) {
    this.log(chalk.green(`? `) + message);
  }

  logDimmed(message: string) {
    this.log(chalk.dim(message));
  }

  async catch(error: any) {
    const { request, body } = error;

    if (error instanceof ApiError) {
      switch (request.status) {
        case 401:
          return this.error(
            `Authentication failure. Please obtain a new deployment key at https://app.subsquid.io and follow the instructions`,
          );
        case 400:
          if (body?.invalidFields) {
            const messages = body.invalidFields.map(function (obj: any, index: number) {
              return `${index + 1}) ${chalk.bold('"' + obj.path.join('.') + '"')} — ${obj.message}`;
            });
            return this.error(`Validation error:\n${messages.join('\n')}`);
          }
          return this.error(body?.error || body?.message || `Validation error ${body}`);
        case 404:
          const url = `${chalk.bold(request.method)} ${chalk.bold(request.url)}`;

          return this.error(
            `Unknown API endpoint ${url}. Check that your are using the latest version of the Squid CLI. If the problem persists, please contact support.`,
          );

        case 405:
          return this.error(body?.error || body?.message || 'Method not allowed');
        case 502:
        case 503:
        case 504:
          return this.error('The API is currently unavailable. Please try again later');
        default:
          return this.error(
            [
              `Unknown network error occurred`,
              `==================`,
              `Status: ${request.status}`,
              `Body:\n${JSON.stringify(body)}`,
            ].join('\n'),
          );
      }
    }

    throw error;
  }

  async promptOrganization(orgCode: string | null | undefined, using: string): Promise<string> {
    if (orgCode) return orgCode;

    const organizations = await listOrganizations();
    if (organizations.length === 0) {
      return this.error(`You have no organizations. Please create organization first.`);
    } else if (organizations.length === 1) {
      return organizations[0].code;
    }

    return await this.getOrganizationPromt(organizations, using);
  }

  async promptSquidOrganization(orgCode: string | null | undefined, squidName: string, using: string): Promise<string> {
    if (orgCode) return orgCode;

    const squids = await listSquids({ squidName });
    const organizations = squids.map((s) => s.organization).filter((o): o is SquidOrganizationResponse => !isNil(o));
    if (organizations.length === 0) {
      return this.error(`No organizations has been found`);
    } else if (organizations.length === 1) {
      return organizations[0].code;
    }

    return await this.getOrganizationPromt(organizations, using);
  }

  private async getOrganizationPromt(organizations: { code: string; name: string }[], using: string) {
    const { stdin, stdout } = getTTY();
    if (!stdin || !stdout) {
      this.log(chalk.dim(`You have ${organizations.length} organizations:`));
      for (const organization of organizations) {
        this.log(`${chalk.dim(' - ')}${chalk.dim(organization.code)}`);
      }
      return this.error(`Please specify one of them explicitly ${using}`);
    }

    const prompt = inquirer.createPromptModule({ input: stdin, output: stdout });
    const { organization } = await prompt([
      {
        name: 'organization',
        type: 'list',
        message: `Please choose an organization:`,
        choices: organizations.map((o) => {
          return {
            name: o.name ? `${o.name} (${o.code})` : o.code,
            value: o.code,
          };
        }),
      },
    ]);

    // Hack to prevent opened descriptors to block event loop before exit
    stdin.destroy();
    stdout.destroy();

    return organization;
  }
}
