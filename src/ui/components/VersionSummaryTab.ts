import chalk from 'chalk';
import Table from 'cli-table3';
import bytes from 'pretty-bytes';
import blessed, { Element } from 'reblessed';

import { SquidProcessor } from '../../api';
import { chalkMainColor, mainColor, scrollBarTheme } from '../theme';

import { VersionTab } from './Tabs';
import { SquidVersion } from './types';

export function numberWithSpaces(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function getProcessors(processor: SquidProcessor) {
  return [`${chalkMainColor(`PROCESSOR`)} ${processor.name} ${chalkMainColor(processor.status)}`];
}

export class VersionSummaryTab implements VersionTab {
  async append(parent: Element, squid: SquidVersion) {
    const lines = [];

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

    const table = new Table({
      head: ['Processor', 'Status', 'Sync rate'],
      wordWrap: true,
      wrapOnWordBoundary: false,
      style: {
        head: [mainColor],
        border: [mainColor],
      },
    });

    lines.push(`${chalkMainColor(`DB`)} ${chalkMainColor(squid.version.db.disk.usageStatus)}`);
    lines.push(dbState);
    lines.push('');

    // table is an Array, so you can `push`, `unshift`, `splice` and friends
    for (const processor of squid.version.processors) {
      const processorPercent = (processor.syncState.currentBlock * 100) / processor.syncState.totalBlocks;
      const processorState = `${processorPercent.toFixed(2)}%\n${numberWithSpaces(
        processor.syncState.currentBlock,
      )} / ${numberWithSpaces(processor.syncState.totalBlocks)}`;

      table.push([processor.name, processor.status, chalk.dim(processorState)]);
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
