import { execSync } from 'child_process';

import { Command } from '@oclif/core';

export default class Docs extends Command {
  static summary = 'Open SDK documentation in the default browser';

  async run(): Promise<void> {
    await this.parse(Docs);

    execSync('open https://docs.subsquid.io');
  }
}
