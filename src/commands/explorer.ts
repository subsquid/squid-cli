import { Command, Flags } from '@oclif/core';
import blessed from 'reblessed';

import { Loader } from '../ui/components/Loader';
import { VersionManager } from '../ui/components/VersionManager';

import { chooseProjectIfRequired } from './projects';

export default class Explorer extends Command {
  static description = 'Squid explorer';
  // static hidden = true;
  static flags = {
    project: Flags.string({
      char: 'p',
      description: 'Project',
      required: false,
      hidden: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { project },
    } = await this.parse(Explorer);

    const projectCode = await chooseProjectIfRequired(project);
    const screen = blessed.screen({
      smartCSR: true,
      fastCSR: true,
      // dockBorders: true,
      debug: true,
      // autoPadding: true,
      fullUnicode: true,
    });

    const manager = new VersionManager(projectCode, {
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
