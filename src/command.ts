import { Args, Command } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { isNil, uniqBy } from 'lodash';

import { ApiError, getOrganization, getSquid, listOrganizations, listUserSquids, SquidRequest } from './api';
import { getTTY } from './tty';
import { parseSquidReference, SQUID_HASH_SYMBOL, SQUID_TAG_SYMBOL } from './utils';

export const SUCCESS_CHECK_MARK = chalk.green('✓');

export abstract class CliCommand extends Command {
  logSuccess(message: string) {
    this.log(SUCCESS_CHECK_MARK + message);
  }

  logQuestion(message: string) {
    this.log(chalk.green(`? `) + message);
  }

  logDimmed(message: string) {
    this.log(chalk.dim(message));
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

  async findSquid({ organization, reference }: SquidRequest) {
    try {
      return getSquid({ organization, reference });
    } catch (e) {
      if (e instanceof ApiError && e.request.status === 404) {
        return null;
      }

      throw e;
    }
  }

  async findOrThrowSquid({ organization, reference }: SquidRequest) {
    const squid = await this.findSquid({ organization, reference });
    if (!squid) {
      throw new Error(`The squid "${reference}" is not found`);
    }

    return squid;
  }

  async promptOrganization(code: string | null | undefined, using?: string) {
    if (code) {
      return await getOrganization({ organization: { code } });
    }

    const organizations = await listOrganizations();
    if (organizations.length === 0) {
      return this.error(`You have no organizations. Please create organization first.`);
    } else if (organizations.length === 1) {
      return organizations[0];
    }

    return await this.getOrganizationPrompt(organizations, using);
  }

  async promptSquidOrganization({
    code,
    reference,
    using,
  }: {
    code?: string | null;
    reference: string;
    using?: string;
  }) {
    if (code) {
      return await getOrganization({ organization: { code } });
    }

    const name =
      reference.includes(SQUID_TAG_SYMBOL) || reference.includes(SQUID_HASH_SYMBOL)
        ? parseSquidReference(reference).name
        : reference;

    const squids = await listUserSquids({ name });

    let organizations = squids.map((s) => s.organization).filter((o) => !isNil(o));
    organizations = uniqBy(organizations, (o) => o.code);

    if (organizations.length === 0) {
      return this.error(`Squid "${name}" was not found.`);
    } else if (organizations.length === 1) {
      return organizations[0];
    }

    return await this.getOrganizationPrompt(organizations, using);
  }

  private async getOrganizationPrompt<T extends { code: string; name: string }>(
    organizations: T[],
    using: string = 'using "-o" flag',
  ): Promise<T> {
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

export const SquidReferenceArg = Args.string({
  description: `<name${SQUID_HASH_SYMBOL}hash> or <name${SQUID_TAG_SYMBOL}tag>`,
  required: true,
  parse: async (input) => {
    input = input.toLowerCase();
    if (!/^[a-z0-9\-]+[:@][a-z0-9\-]+$/.test(input)) {
      throw new Error(`Expected a squid reference but received: ${input}`);
    }
    return input;
  },
});
