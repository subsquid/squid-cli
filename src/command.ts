import { Command, Flags } from '@oclif/core';
import { FailedFlagValidationError } from '@oclif/core/lib/parser/errors';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { isNil, uniqBy } from 'lodash';

import { ApiError, getOrganization, getSquid, listOrganizations, listUserSquids, SquidRequest } from './api';
import { getTTY } from './tty';
import { formatSquidReference, printSquid } from './utils';

export const SUCCESS_CHECK_MARK = chalk.green('✓');

export abstract class CliCommand extends Command {
  static baseFlags = {
    interactive: Flags.boolean({
      description: 'Disable interactive mode',
      required: false,
      default: true,
      allowNo: true,
    }),
  };

  logSuccess(message: string) {
    this.log(SUCCESS_CHECK_MARK + message);
  }

  logQuestion(message: string) {
    this.log(chalk.green(`? `) + message);
  }

  logDimmed(message: string) {
    this.log(chalk.dim(message));
  }

  // Haven't find a way to do it with native settings
  validateSquidNameFlags(flags: { reference?: any; name?: any }) {
    if (flags.reference || flags.name) return;

    throw new FailedFlagValidationError({
      failed: [
        {
          name: 'squid name',
          validationFn: 'validateSquidName',
          reason: 'One of the following must be provided: --reference, --name',
          status: 'failed',
        },
      ],
      parse: {},
    });
  }

  async catch(error: any) {
    if (error instanceof ApiError) {
      const { request, body } = error;

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
          const defaultErrorStart = `cannot ${request.method.toLowerCase()}`;

          if (
            body.error.toLowerCase().startsWith(defaultErrorStart) ||
            body.message?.toLowerCase().startsWith(defaultErrorStart)
          ) {
            const url = `${chalk.bold(request.method)} ${chalk.bold(request.url)}`;

            return this.error(
              `Unknown API endpoint ${url}. Check that your are using the latest version of the Squid CLI. If the problem persists, please contact support.`,
            );
          } else {
            return this.error(body.error);
          }
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

  async findSquid(req: SquidRequest) {
    try {
      return await getSquid(req);
    } catch (e) {
      if (e instanceof ApiError && e.request.status === 404) {
        return null;
      }

      throw e;
    }
  }

  async findOrThrowSquid({ organization, squid }: SquidRequest) {
    const res = await this.findSquid({ organization, squid });
    if (!res) {
      throw new Error(
        `The squid ${formatSquidReference(typeof squid === 'string' ? squid : squid, { colored: true })} is not found`,
      );
    }

    return res;
  }

  async promptOrganization(
    code: string | null | undefined,
    { using, interactive }: { using?: string; interactive?: boolean } = {},
  ) {
    if (code) {
      return await getOrganization({ organization: { code } });
    }

    const organizations = await listOrganizations();

    return await this.getOrganizationPrompt(organizations, { using, interactive });
  }

  async promptSquidOrganization(
    code: string | null | undefined,
    name: string,
    {
      using,
      interactive,
    }: {
      using?: string;
      interactive?: boolean;
    } = {},
  ) {
    if (code) {
      return await getOrganization({ organization: { code } });
    }

    const squids = await listUserSquids({ name });

    let organizations = squids.map((s) => s.organization).filter((o) => !isNil(o));
    organizations = uniqBy(organizations, (o) => o.code);

    if (organizations.length === 0) {
      return this.error(`You have no organizations with squid "${name}".`);
    }

    return await this.getOrganizationPrompt(organizations, { using, interactive });
  }

  private async getOrganizationPrompt<T extends { code: string; name: string }>(
    organizations: T[],
    {
      using = 'using "--org" flag',
      interactive,
    }: {
      using?: string;
      interactive?: boolean;
    },
  ): Promise<T> {
    if (organizations.length === 0) {
      return this.error(`You have no organizations. Please create organization first.`);
    } else if (organizations.length === 1) {
      return organizations[0];
    }

    const { stdin, stdout } = getTTY();
    if (!stdin || !stdout || !interactive) {
      return this.error(
        [
          `You have ${organizations.length} organizations:`,
          ...organizations.map((o) => `${chalk.dim(' - ')}${chalk.dim(o.code)}`),
          `Please specify one of them explicitly ${using}`,
        ].join('\n'),
      );
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
            value: o,
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

export * as SqdFlags from './flags';
