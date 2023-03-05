import chalk from 'chalk';
import figlet from 'figlet';
import { defaultsDeep } from 'lodash';
import bytes from 'pretty-bytes';
import blessed, { Element, List, Widgets } from 'reblessed';

import { chalkMainColor, defaultBoxTheme, mainColor } from '../theme';

import { Tabs } from './Tabs';
import { SquidVersion } from './types';

const figletAsync = (text: string, options?: figlet.Options) => {
  return new Promise<string>((resolve, reject) => {
    figlet(text, options, (error, result) => {
      if (error || !result) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });
};

export function numberWithSpaces(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function renderSummary(parent: Element, squid: SquidVersion) {
  const lines = [];

  const processorPercent =
    (squid.version.processor.syncState.currentBlock * 100) / squid.version.processor.syncState.totalBlocks;
  const processorState = `Sync ${processorPercent.toFixed(2)}% ${numberWithSpaces(
    squid.version.processor.syncState.currentBlock,
  )} / ${numberWithSpaces(squid.version.processor.syncState.totalBlocks)}`;

  const dbUsedPercent = (squid.version.db.disk.usedBytes * 100) / squid.version.db.disk.totalBytes;
  const dbState = `Used ${dbUsedPercent.toFixed(2)}% ${bytes(squid.version.db.disk.usedBytes)} / ${bytes(
    squid.version.db.disk.totalBytes,
  )}`;

  if (squid.version.description) {
    lines.push(squid.version.description);
    lines.push('');
  }

  lines.push(`${chalkMainColor(`API`)} ${chalkMainColor(squid.version.api.status)}`);
  lines.push(`${squid.version.deploymentUrl}`);
  lines.push('');

  lines.push(`${chalkMainColor(`PROCESSOR`)} ${chalkMainColor(squid.version.processor.status)}`);
  lines.push(chalk.dim(processorState));
  lines.push('');

  lines.push(`${chalkMainColor(`DB`)} ${chalkMainColor(squid.version.db.disk.usageStatus)}`);
  lines.push(dbState);

  parent.append(
    blessed.box({
      content: lines.join('\n'),
    }),
  );
}

function renderDbAccess(parent: Element, squid: SquidVersion) {
  const lines = [];

  lines.push(chalkMainColor(`URL`));
  lines.push(squid.version.db.ingress.url);
  lines.push('');

  lines.push(chalkMainColor(`DB`));
  lines.push(squid.version.db.ingress.db);
  lines.push('');

  lines.push(chalkMainColor(`User`));
  lines.push(squid.version.db.ingress.user);
  lines.push('');

  lines.push(chalkMainColor(`Password`));
  lines.push(squid.version.db.ingress.password);
  lines.push('');
  lines.push('');

  lines.push(chalkMainColor(`PSQL command`));
  lines.push(
    chalk.bgBlackBright(
      `PGPASSWORD=${squid.version.db.ingress.password} pqsl -h ${squid.version.db.ingress.url} -d ${squid.version.db.ingress.db} -U ${squid.version.db.ingress.user}`,
    ),
  );
  lines.push('');

  parent.append(
    blessed.box({
      content: lines.join('\n'),
    }),
  );
}

function renderLogs(parent: Element, squid: SquidVersion) {
  const lines = [];

  lines.push('Not yet implemented');

  parent.append(
    blessed.box({
      content: lines.join('\n'),
    }),
  );
}

export class VersionView extends List {
  header: Element;
  tabs: Tabs;

  constructor(options: Widgets.BoxOptions) {
    super(
      defaultsDeep(options, defaultBoxTheme, {
        tags: true,
        content: '',
      }),
    );

    this.header = blessed.box({
      top: '0',
      left: '0',
      width: '100%-3',
      style: {
        fg: mainColor,
      },
    });

    this.tabs = new Tabs(
      [
        {
          name: 'Summary',
          keys: ['1'],
          render: renderSummary,
        },
        {
          name: 'Logs',
          keys: ['2'],
          render: renderLogs,
        },
        {
          name: 'Deploys',
          keys: ['3'],
          render: renderLogs,
        },
        {
          name: 'DB Access',
          keys: ['4'],
          render: renderDbAccess,
        },
      ],
      {
        left: 2,
        top: 7,
      },
    );

    this.append(this.header);
    this.append(this.tabs);
  }

  async setSquid(squid: SquidVersion) {
    const width = typeof this.width === 'string' ? parseInt(this.width) : this.width;

    const title = await figletAsync(squid.name, { width: width - 3, whitespaceBreak: true });
    const lines = title.split('\n');

    this.tabs.position.top = lines.length + 2;

    this.header.setContent(title);
    this.tabs.setVersion(squid);
    this.setLabel(squid.name);
  }
}
