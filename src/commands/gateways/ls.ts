import { Args, ux as CliUx, Flags } from '@oclif/core';

import { listEVM, listSubstrate } from '../../api/gateways-api';
import { CliCommand } from '../../command';

export default class Ls extends CliCommand {
  static description = 'List available gateways';

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
      description: 'name of archive to search',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { name },
      flags: { type },
    } = await this.parse(Ls);

    const gatewaysResponse = type === 'evm' ? await listEVM() : await listSubstrate();
    const gateways = name
      ? gatewaysResponse.archives.filter((g) => g.network.toLocaleLowerCase().includes(name.toLocaleLowerCase()))
      : gatewaysResponse.archives;

    if (!gateways.length) {
      return this.error('No gateways found');
    }

    CliUx.ux.table(
      gateways.map(({ network, providers }) => ({
        network,
        release: providers[0].release,
        url: providers[0].dataSourceUrl,
      })),
      {
        network: { header: 'Name' },
        release: { header: 'Release' },
        url: { header: 'Gateway URL' },
      },
      {
        'no-truncate': true,
      },
    );
  }
}
