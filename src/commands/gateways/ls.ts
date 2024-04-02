import { ux as CliUx, Flags } from '@oclif/core';

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
    search: Flags.string({
      char: 's',
      description: 'name of gateway to search',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { type, search },
    } = await this.parse(Ls);

    const gatewaysResponse = type === 'evm' ? await listEVM() : await listSubstrate();
    const gateways = search
      ? gatewaysResponse.archives.filter((g) => g.network.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
      : gatewaysResponse.archives;

    if (!gateways.length) {
      return this.log('No gateways found');
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
