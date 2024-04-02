import { ux as CliUx, Flags } from '@oclif/core';
import chalk from 'chalk';

import { Gateway, GatewaysResponse, listEVM, listSubstrate } from '../../api/gateways-api';
import { CliCommand } from '../../command';

export default class Ls extends CliCommand {
  static description = 'List available gateways';

  static flags = {
    type: Flags.string({
      char: 't',
      description: 'network type: EVM/Substrate',
      options: ['evm', 'substrate'],
      helpValue: '<evm|substrate>',
      required: false,
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

    switch (type) {
      case 'evm':
        this.processGateways(await listEVM(), search);
        break;
      case 'substrate':
        this.processGateways(await listSubstrate(), search);
        break;
      default:
        this.processGateways(await listEVM(), search, 'EVM');
        this.log();
        this.processGateways(await listSubstrate(), search, 'Substrate');
    }
  }

  processGateways(gateways: Gateway[], search: string | undefined, type?: string) {
    if (type) {
      this.log(chalk.bold(`${type}:`));
    }

    gateways = search
      ? gateways.filter((g) => g.network.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
      : gateways;

    if (!gateways.length) {
      return this.log('No gateways found');
    }

    CliUx.ux.table(
      gateways.map(({ network, providers }) => ({
        network,
        release: chalk.dim(providers[0].release),
        url: providers[0].dataSourceUrl,
      })),
      {
        network: { header: 'Name' },
        release: { header: 'Release', minWidth: 12 },
        url: { header: 'Gateway URL' },
      },
      {
        'no-truncate': true,
      },
    );
  }
}
