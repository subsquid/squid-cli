import chalk from 'chalk';
import bytes from 'pretty-bytes';
import blessed, { Element } from 'reblessed';

import { chalkMainColor, scrollBarTheme } from '../theme';

import { VersionTab } from './Tabs';
import { SquidVersion } from './types';

export function numberWithSpaces(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export class VersionSummaryTab implements VersionTab {
  async append(parent: Element, squid: SquidVersion) {
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
        scrollable: true,
        mouse: true,
        scrollbar: scrollBarTheme,
      }),
    );
  }
}
