import { ux as CliUx, Flags } from '@oclif/core';

import { listEVM, listSubstrate } from '../../api/archives-api';
import { CliCommand } from '../../command';

export default class Ls extends CliCommand {
  static description = 'List available archives';

  static flags = {
    type: Flags.string({
      char: 't',
      description: 'network type: EVM/Substrate',
      options: ['evm', 'substrate'],
      helpValue: '<evm|substrate>',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { type },
    } = await this.parse(Ls);

    const archives = type === 'evm' ? await listEVM() : await listSubstrate();

    CliUx.ux.table(
      archives.archives.map(({ network, providers }) => ({ network, release: providers[0].release })),
      {
        network: { header: 'Name' },
        release: { header: 'Release' },
      },
    );
  }
}
