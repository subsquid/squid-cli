import { Args, ux as CliUx, Flags } from '@oclif/core';

import { listEVM, listSubstrate } from '../../api/archives-api';
import { CliCommand } from '../../command';

export default class Lookup extends CliCommand {
  static description = 'Lookup for archive address';

  static flags = {
    type: Flags.string({
      char: 't',
      description: 'network type: EVM/Substrate',
      options: ['evm', 'substrate'],
      helpValue: '<evm|substrate>',
      required: true,
    }),
  };

  static args = {
    name: Args.string({
      description: 'name of archive to lookup',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { name },
      flags: { type },
    } = await this.parse(Lookup);

    const archives = type === 'evm' ? await listEVM() : await listSubstrate();
    const archive = archives.archives.find((a) => a.network.toLocaleLowerCase() === name.toLocaleLowerCase());

    if (!archive) return this.error('No archive with such name');

    CliUx.ux.table(
      [archive].map(({ network, providers }) => ({
        network,
        release: providers[0].release,
        url: providers[0].dataSourceUrl,
      })),
      {
        network: { header: 'Name' },
        release: { header: 'Release' },
        url: { header: 'URL' },
      },
    );
  }
}
