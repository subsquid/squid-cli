import { Flags } from '@oclif/core';
import blessed from 'reblessed';

import { CliCommand } from '../command';
import { Loader } from '../ui/components/Loader';
import { VersionManager } from '../ui/components/VersionManager';

export default class Explorer extends CliCommand {
  static description = 'Open a visual explorer for the Cloud deployments';
  // static hidden = true;
  static flags = {
    org: Flags.string({
      char: 'o',
      description: 'Organization',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { org },
    } = await this.parse(Explorer);

    const organization = await this.promptOrganization(org, 'using "-o" flag');
    const screen = blessed.screen({
      smartCSR: true,
      fastCSR: true,
      // dockBorders: true,
      debug: true,
      // autoPadding: true,
      fullUnicode: true,
    });

    const manager = new VersionManager(organization, {
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
    });

    const loader = new Loader({
      top: '50%',
      left: '50%',
    });

    manager.hide();

    screen.append(loader);
    screen.append(manager);

    await manager.load();
    await loader.destroyWithTimeout();

    manager.show();

    screen.key(['C-c'], () => {
      return process.exit(0);
    });

    // screen.program.disableMouse();

    manager.focus();
    screen.render();
  }
}
