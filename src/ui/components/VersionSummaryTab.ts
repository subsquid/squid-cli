import chalk from 'chalk';
import Table from 'cli-table3';
import bytes from 'pretty-bytes';
import blessed, { Element } from 'reblessed';

import { SquidProcessor } from '../../api';
import { chalkMainColor, mainColor, scrollBarTheme } from '../theme';

import { VersionTab } from './Tabs';
import { Squid } from './types';

export function numberWithSpaces(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function getProcessors(processor: SquidProcessor) {
  return [`${chalkMainColor(`PROCESSOR`)} ${processor.name} ${chalkMainColor(processor.status)}`];
}

export class VersionSummaryTab implements VersionTab {
  async append(parent: Element, squid: Squid) {
    const lines = [];

    if (squid.description) {
      lines.push(squid.description);
      lines.push('');
    }

    lines.push(`${chalkMainColor(`API`)} ${chalkMainColor(squid.api?.status)}`);
    for (const url of squid.api?.urls || []) {
      lines.push(`${url.url}`);
    }

    lines.push('');

    const table = new Table({
      head: ['Processor', 'Status', 'Sync rate'],
      wordWrap: true,
      wrapOnWordBoundary: false,
      style: {
        head: [mainColor],
        border: [mainColor],
      },
    });

    const addonPostgres = squid.addons?.postgres;
    if (addonPostgres) {
      const usedBytes = addonPostgres.disk.usedBytes || 0;
      const totalBytes = addonPostgres.disk.totalBytes || 0;

      const dbUsedPercent = totalBytes > 0 ? (usedBytes * 100) / totalBytes : 0;
      const dbState = `Used ${dbUsedPercent.toFixed(2)}% ${bytes(usedBytes)} / ${bytes(totalBytes)}`;

      lines.push(`${chalkMainColor(`DB`)} ${chalkMainColor(addonPostgres.disk.usageStatus)}`);
      lines.push(dbState);
      lines.push('');
    }

    if (squid.processors) {
      // table is an Array, so you can `push`, `unshift`, `splice` and friends
      for (const processor of squid.processors) {
        const processorPercent = (processor.syncState.currentBlock * 100) / processor.syncState.totalBlocks;
        const processorState = `${processorPercent.toFixed(2)}%\n${numberWithSpaces(
          processor.syncState.currentBlock,
        )} / ${numberWithSpaces(processor.syncState.totalBlocks)}`;

        table.push([processor.name, processor.status, chalk.dim(processorState)]);
      }
    }

    lines.push(table.toString());

    parent.append(
      blessed.box({
        content: lines.join('\n'),
        scrollable: true,
        mouse: true,
        scrollbar: scrollBarTheme,
      }),
    );
  }
}
