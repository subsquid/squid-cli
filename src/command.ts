import { Command } from '@oclif/core';
import chalk from 'chalk';

import { ApiError } from './api';

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
  async catch(error: any) {
    const { status, body } = error;

    if (error instanceof ApiError) {
      switch (status) {
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
          return this.error(
            `Unknown API endpoint. Check that your are using the latest version of the Squid CLI. Message: ${
              body?.error || body?.message || 'API url not found'
            }`,
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
              `Status: ${status}`,
              `Body:\n${JSON.stringify(body)}`,
            ].join('\n'),
          );
      }
    }

    throw error;
  }
}
