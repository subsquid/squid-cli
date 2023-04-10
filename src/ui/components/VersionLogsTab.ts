import { addMinutes } from 'date-fns';
import blessed, { Element, List, Log } from 'reblessed';

import { streamSquidLogs, versionHistoryLogs } from '../../api';
import { pretty } from '../../logs';
import { mainColor, scrollBarTheme } from '../theme';

import { Loader } from './Loader';
import { VersionTab } from './Tabs';
import { SquidVersion } from './types';

export class VersionLogTab implements VersionTab {
  async append(parent: Element, squid: SquidVersion) {
    const logsBox = blessed.log({
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      scrollable: true,
      scrollbar: scrollBarTheme,
      alwaysScroll: true,
      mouse: true,
      style: {
        scrollbar: {
          bg: mainColor,
          fg: 'white',
        },
      },
    } as any);
    logsBox.hide();

    const loader = new Loader();
    parent.append(logsBox);
    parent.append(loader);

    const abortController = new AbortController();

    process.nextTick(async () => {
      try {
        const { logs } = await versionHistoryLogs(
          squid.squid.name,
          squid.version.name,
          {
            limit: 100,
            from: addMinutes(new Date(), -30),
          },
          {
            abortController,
          },
        );
        pretty(logs.reverse()).forEach((line) => {
          logsBox.add(line);
        });
      } catch (e: any) {
        if (e?.type === 'aborted') return;

        throw e;
      }
      await loader.destroyWithTimeout();
      logsBox.show();
      logsBox.screen.render();

      streamSquidLogs(
        squid.squid.name,
        squid.version.name,
        (line) => {
          logsBox.add(line);
        },
        {},
        { abortController },
      );
    });

    return () => {
      abortController.abort();
    };
  }
}
