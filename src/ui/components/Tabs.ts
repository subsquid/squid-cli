import blessed, { Element, Widgets } from 'reblessed';

import { mainColor } from '../theme';

import { Squid } from './types';

interface VersionTabConstructor {
  new (): VersionTab;
}

export type Cancellable = void | (() => void) | undefined;

export interface VersionTab {
  append(holder: Element, squid: Squid): Promise<Cancellable>;
}

export type Tab = {
  name: string;
  keys: string[];
  renderer: VersionTabConstructor;
};

export class Tabs extends Element {
  menu: any;
  squid: Squid | undefined;
  selectedTab = 0;
  wrapper: Element | undefined;
  cancel: Cancellable | undefined;

  constructor(tabs: Tab[], options: Widgets.BoxOptions = {}) {
    super(options);

    const commands = tabs.reduce((res, tab, currentIndex) => {
      return {
        ...res,
        [tab.name]: {
          keys: tab.keys,
          callback: async () => {
            // if (this.selectedTab === currentIndex) return;
            if (!this.squid) return;
            if (this.squid?.isHibernated()) {
              return;
            }

            if (typeof this.cancel === 'function') {
              this.cancel();
            }

            this.selectedTab = currentIndex;
            this.wrapper?.destroy();
            this.wrapper = blessed.box({
              top: 2,
              left: '15',
            });

            this.append(this.wrapper);

            const renderer = new tab.renderer();

            try {
              this.cancel = await renderer.append(this.wrapper, this.squid);
            } catch (e) {}
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
      mouse: true,

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

  setVersion(squid: Squid) {
    // if (squid === this.squid) return;
    this.screen.debug('set version');
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
