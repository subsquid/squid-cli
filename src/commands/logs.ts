import { Flags, ux as CliUx } from '@oclif/core';
import { isNil, omitBy } from 'lodash';
import ms from 'ms';

import { debugLog, squidHistoryLogs, SquidRequest, streamSquidLogs } from '../api';
import { CliCommand, SqdFlags } from '../command';
import { pretty } from '../logs';
import { formatSquidReference } from '../utils';

type LogResult = {
  hasLogs: boolean;
  nextPage: string | null;
};

function parseDate(str: string): Date {
  const date = Date.parse(str);
  if (!isNaN(date)) {
    return new Date(date);
  }

  return new Date(Date.now() - ms(str));
}

export default class Logs extends CliCommand {
  static description = 'Fetch logs from a squid deployed to the Cloud';

  static flags = {
    org: SqdFlags.org({
      required: false,
    }),
    name: SqdFlags.name({
      required: false,
    }),
    slot: SqdFlags.slot({
      required: false,
    }),
    tag: SqdFlags.tag({
      required: false,
    }),
    fullname: SqdFlags.fullname({
      required: false,
    }),
    container: Flags.string({
      char: 'c',
      summary: `Container name`,
      required: false,
      multiple: true,
      options: ['processor', 'query-node', 'api', 'db-migrate', 'db'],
    }),
    pageSize: Flags.integer({
      char: 'p',
      summary: 'Logs page size',
      required: false,
      default: 100,
    }),
    level: Flags.string({
      char: 'l',
      summary: 'Log level',
      required: false,
      multiple: true,
      options: ['error', 'debug', 'info', 'warning'],
    }),
    since: Flags.string({
      summary: 'Filter by date/interval',
      required: false,
      default: '1d',
    }),
    search: Flags.string({
      summary: 'Filter by content',
      required: false,
    }),
    follow: Flags.boolean({
      char: 'f',
      summary: 'Follow',
      required: false,
      default: false,
      exclusive: ['fromDate', 'pageSize'],
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { follow, pageSize, container, level, since, search, fullname, interactive, ...flags },
    } = await this.parse(Logs);

    this.validateSquidNameFlags({ fullname, ...flags });

    const { org, name, tag, slot } = fullname ? fullname : (flags as any);

    const organization = await this.promptSquidOrganization(org, name, { interactive });
    const squid = await this.findOrThrowSquid({ organization, squid: { name, slot, tag } });
    if (!squid) return;

    const fromDate = parseDate(since);
    this.log(`Fetching logs from ${fromDate.toISOString()}...`);
    if (follow) {
      await this.fetchLogs({
        organization,
        squid,
        reverse: true,
        query: {
          limit: 30,
          from: fromDate,
          container,
          level,
          search,
        },
      });
      await streamSquidLogs({
        organization,
        squid,
        onLog: (l) => this.log(l),
        query: { container, level, search },
      });
      debugLog(`done`);
      return;
    }
    let cursor = undefined;
    do {
      const { hasLogs, nextPage }: LogResult = await this.fetchLogs({
        organization,
        squid,
        query: {
          limit: pageSize,
          from: fromDate,
          nextPage: cursor,
          container,
          level,
          search,
        },
      });
      if (!hasLogs) {
        this.log('No logs found');
        return;
      }
      if (nextPage) {
        const more = await CliUx.ux.prompt(`type "it" to fetch more logs...`);
        if (more !== 'it') {
          return;
        }
      }
      cursor = nextPage;
    } while (cursor);
  }

  async fetchLogs({
    organization,
    squid,
    query,
    reverse,
  }: SquidRequest & {
    reverse?: boolean;
    query: {
      limit: number;
      from: Date;
      container?: string[];
      nextPage?: string;
      orderBy?: string;
      level?: string[];
      search?: string;
    };
  }): Promise<LogResult> {
    // eslint-disable-next-line prefer-const
    let { logs, nextPage } = await squidHistoryLogs({ organization, squid, query });

    if (reverse) {
      logs = logs.reverse();
    }
    pretty(logs).forEach((l) => {
      this.log(l);
    });

    return { hasLogs: logs.length > 0, nextPage };
  }
}
