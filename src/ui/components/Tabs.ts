import blessed, { Element, Widgets } from 'reblessed';

import { mainColor } from '../theme';

import { SquidVersion } from './types';

export type Tab = {
  name: string;
  keys: string[];
  render: (holder: Element, squid: SquidVersion) => void;
};

export class Tabs extends Element {
  menu: any;
  squid: SquidVersion | undefined;
  selectedTab = 0;
  wrapper: Element | undefined;

  constructor(tabs: Tab[], options: Widgets.BoxOptions = {}) {
    super(options);

    const commands = tabs.reduce((res, tab, currentIndex) => {
      return {
        ...res,
        [tab.name]: {
          keys: tab.keys,
          callback: () => {
            if (this.squid?.isHibernated()) {
              return;
            }

            this.selectedTab = currentIndex;
            this.wrapper?.destroy();
            this.wrapper = blessed.box({
              top: 2,
              left: '15',
            });

            if (!this.squid) return;

            tab.render(this.wrapper, this.squid);
            this.append(this.wrapper);
          },
        },
      };
    }, {});

    this.menu = blessed.listbar({
      top: '0',
      left: '0',
      width: '100%-10',

      autoCommandKeys: false,
      keys: true,

      style: {
        item: {
          fg: 'white',
          bg: 'black',
          border: mainColor,
        },
        selected: {
          fg: 'white',
          bg: mainColor,
        },
      },
      commands,
    } as any);

    this.append(this.menu);

    // this.menu.selectTab(this.selectedTab);
  }

  setVersion(squid: SquidVersion) {
    this.squid = squid;

    if (squid.isHibernated()) {
      this.wrapper?.destroy();
      this.wrapper = blessed.box({
        top: '40',
        left: '15',
        content: `The squid is hibernated due to inactivity. Redeploy it to activate`,
      });
      this.append(this.wrapper);
      this.menu.hide();
    } else {
      this.menu.show();
      this.menu.selectTab(this.selectedTab);
    }
  }
}
