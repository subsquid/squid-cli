import { json } from 'stream/consumers';

import { ux as CliUx, Flags } from '@oclif/core';
import { Manifest, ManifestValue } from '@subsquid/manifest';
import chalk from 'chalk';
import { startCase, toUpper } from 'lodash';
import prettyBytes from 'pretty-bytes';

import { getSquid, Squid, SquidAddonsPostgres } from '../api';
import {
  SquidAddonsHasuraResponseStatus,
  SquidApiResponseStatus,
  SquidDiskResponseUsageStatus,
  SquidProcessorResponseStatus,
  SquidResponseStatus,
} from '../api/schema';
import { CliCommand, SqdFlags } from '../command';
import { printSquid } from '../utils';

export default class View extends CliCommand {
  static description = 'View information about a squid';

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
    reference: SqdFlags.reference({
      required: false,
    }),
    json: Flags.boolean({
      description: 'Output in JSON format',
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { reference, interactive, json, ...flags },
    } = await this.parse(View);

    this.validateSquidNameFlags({ reference, ...flags });

    const { org, name, slot, tag } = reference ? reference : (flags as any);

    const organization = name
      ? await this.promptSquidOrganization(org, name, { interactive })
      : await this.promptOrganization(org, { interactive });

    const squid = await getSquid({ organization, squid: { name, tag, slot } });

    if (json) {
      return this.log(JSON.stringify(squid, null, 2));
    }

    this.log(`${printSquid(squid)} (${squid.tags.map((t) => t.name).join(', ')})`);
    CliUx.ux.styledHeader('General');
    printInfoTable([
      {
        name: 'Status',
        value: formatSquidStatus(squid.status),
      },
      {
        name: 'Description',
        value: squid.description,
      },
      {
        name: 'Hibernated',
        value: squid.hibernatedAt && new Date(squid.hibernatedAt).toUTCString(),
      },
      {
        name: 'Deployed',
        value: squid.deployedAt && new Date(squid.deployedAt).toUTCString(),
      },
      {
        name: 'Created',
        value: squid.createdAt && new Date(squid.createdAt).toUTCString(),
      },
    ]);
    if (squid.status !== 'HIBERNATED') {
      if (squid.api) {
        CliUx.ux.styledHeader('API');
        printInfoTable([
          {
            name: 'Status',
            value: formatApiStatus(squid.api?.status),
          },
          {
            name: 'URL',
            value: squid.api?.urls?.map((u) => chalk.underline(u.url)).join('\n'),
          },
          {
            name: 'Profile',
            value: startCase(getManifest(squid).scale?.api?.profile),
          },
          {
            name: 'Replicas',
            value: getManifest(squid).scale?.api?.replicas,
          },
        ]);
      }
      for (const processor of squid.processors || []) {
        CliUx.ux.styledHeader(`Processor (${processor.name})`);
        printInfoTable([
          {
            name: 'Status',
            value: formatProcessorStatus(processor.status),
          },
          {
            name: 'Progress',
            value: `${processor.syncState.currentBlock}/${processor.syncState.totalBlocks} (${Math.round((processor.syncState.currentBlock / processor.syncState.totalBlocks) * 100)}%)`,
          },
          {
            name: 'Profile',
            value: startCase(getManifest(squid).scale?.processor?.profile),
          },
        ]);
      }
      if (squid.addons?.postgres) {
        CliUx.ux.styledHeader('Addon (Postgres)');
        printInfoTable([
          {
            name: 'Usage',
            value: formatPostgresStatus(squid.addons?.postgres?.disk.usageStatus),
          },
          {
            name: 'Disk',
            value: `${prettyBytes(squid.addons?.postgres?.disk.usedBytes)}/${prettyBytes(squid.addons?.postgres?.disk.totalBytes)} (${Math.round((squid.addons?.postgres?.disk.usedBytes / squid.addons?.postgres?.disk.totalBytes) * 100)}%)`,
          },
          {
            name: 'URL',
            value: squid.addons?.postgres?.connections?.map((c) => chalk.underline(c.uri)).join('\n'),
          },
          {
            name: 'Profile',
            value: startCase(getManifest(squid).scale?.addons?.postgres?.profile),
          },
        ]);
      }
      if (squid.addons?.neon) {
        CliUx.ux.styledHeader('Addon (Neon)');
        printInfoTable([
          {
            name: 'URL',
            value: squid.addons?.neon?.connections?.map((c) => chalk.underline(c.uri)),
          },
        ]);
      }
      if (squid.addons?.hasura) {
        CliUx.ux.styledHeader('Addon (Hasura)');
        printInfoTable([
          {
            name: 'Status',
            value: formatApiStatus(squid.addons?.hasura?.status),
          },
          {
            name: 'URL',
            value: squid.addons?.hasura?.urls?.map((u) => chalk.underline(u.url)).join('\n'),
          },
          {
            name: 'Profile',
            value: startCase(squid.addons?.hasura?.profile),
          },
          {
            name: 'Replicas',
            value: squid.addons?.hasura?.replicas,
          },
        ]);
      }
    }
    this.log();
    this.log(`View this squid in Cloud: ${squid.links.cloudUrl}`);
  }
}

function printInfoTable(
  data: {
    name: string;
    value: any;
  }[],
) {
  CliUx.ux.table(
    data,
    {
      name: {
        get: (v) => chalk.bold(v.name),
        minWidth: 12,
      },
      value: {
        get: (v) => v.value ?? '-',
      },
    },
    { 'no-header': true },
  );
}

function formatSquidStatus(status?: SquidResponseStatus) {
  switch (status) {
    case 'HIBERNATED':
      return chalk.gray(status);
    case 'DEPLOYED':
      return chalk.green(status);
    case 'DEPLOYING':
      return chalk.blue(status);
    case 'DEPLOY_ERROR':
      return chalk.red(status);
    default:
      return status;
  }
}

function formatApiStatus(status?: SquidApiResponseStatus | SquidAddonsHasuraResponseStatus) {
  switch (status) {
    case 'AVAILABLE':
      return chalk.green(status);
    case 'NOT_AVAILABLE':
      return chalk.red(status);
    default:
      return status;
  }
}

function formatProcessorStatus(status?: SquidProcessorResponseStatus) {
  switch (status) {
    case 'STARTING':
      return chalk.blue(status);
    case 'SYNCING':
      return chalk.yellow(status);
    case 'SYNCED':
      return chalk.green(status);
    default:
      return status;
  }
}

function getManifest(squid: Squid): ManifestValue {
  return squid.manifest.current as ManifestValue;
}

function formatPostgresStatus(status?: SquidDiskResponseUsageStatus): any {
  switch (status) {
    case 'LOW':
      return chalk.green(status);
    case 'NORMAL':
      return chalk.green(status);
    case 'WARNING':
      return chalk.yellow(status);
    case 'CRITICAL':
      return chalk.red(status);
    default:
      return status;
  }
}
