import figlet from 'figlet';
import { defaultsDeep } from 'lodash';
import blessed, { Element, List, Widgets } from 'reblessed';

import { defaultBoxTheme, mainColor } from '../theme';

import { Tabs } from './Tabs';
import { Squid } from './types';
import { VersionDbAccessTab } from './VersionDbAccessTab';
import { SquidDeployTab } from './VersionDeployTab';
import { VersionLogTab } from './VersionLogsTab';
import { VersionSummaryTab } from './VersionSummaryTab';

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
          renderer: VersionSummaryTab,
        },
        {
          name: 'Logs',
          keys: ['2'],
          renderer: VersionLogTab,
        },
        {
          name: 'DB Access',
          keys: ['3'],
          renderer: VersionDbAccessTab,
        },
        // {
        //   name: 'Deploys',
        //   keys: ['4'],
        //   renderer: VersionDeployTab,
        // },
      ],
      {
        left: 2,
        top: 7,
      },
    );

    this.append(this.header);
    this.append(this.tabs);
  }

  async setSquid(squid: Squid) {
    const width = typeof this.width === 'string' ? parseInt(this.width) : this.width;

    const title = await figletAsync(squid.name, { width: width - 3, whitespaceBreak: true });
    const lines = title.split('\n');

    this.tabs.position.top = lines.length + 2;

    this.header.setContent(title);
    this.tabs.setVersion(squid);
    this.setLabel(squid.name);
  }
}
