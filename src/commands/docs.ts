import { execSync } from 'child_process';

import { Command } from '@oclif/core';

export default class Docs extends Command {
  static description = 'Open the docs in a browser';

  async run(): Promise<void> {
    await this.parse(Docs);

    execSync('open https://docs.subsquid.io');
  }
}
