import blessed, { Element } from 'reblessed';

import { getDeploys } from '../../api';
import { mainColor } from '../theme';

import { Loader } from './Loader';
import { VersionTab } from './Tabs';
import { Squid } from './types';

export class SquidDeployTab implements VersionTab {
  async append(parent: Element, squid: Squid) {
    const list = blessed.listtable({
      top: 0,
      left: 0,
      // tags: true,
      style: {
        header: {
          align: 'left',
          fg: 'white',
        },
        selected: {
          bg: mainColor,
        },
        fg: mainColor,
        item: {
          align: 'left',
          fg: 'white',
        },
      },
      mouse: true,
    });
    list.hide();
    const loader = new Loader();
    parent.append(list);
    parent.append(loader);

    const deploys = squid.organization ? await getDeploys({ organization: squid.organization }) : [];

    list.setRows([
      ['ID', 'Status', 'Failed', 'Logs', 'Created'],
      ...deploys.map((deploy) => {
        return [deploy.id.toString(), deploy.status, deploy.failed, deploy.logs.length.toString(), deploy.createdAt];
      }),
    ]);

    await loader.destroyWithTimeout();
    list.show();
    list.screen.render();
  }
}
