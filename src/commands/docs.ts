import { Command } from '@oclif/core';
import open from 'open';

export default class Docs extends Command {
  static description = 'Open the docs in a browser';

  async run(): Promise<void> {
    await this.parse(Docs);

    void open('https://docs.subsquid.io');
  }
}
