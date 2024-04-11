import { Flags } from '@oclif/core';
import chalk from 'chalk';
import Table from 'cli-table3';
import { maxBy } from 'lodash';

import { Gateway, getEvmGateways, getSubstrateGateways } from '../../api/gateways';
import { CliCommand } from '../../command';

export default class Ls extends CliCommand {
  static description = 'List available gateways';

  static flags = {
    type: Flags.string({
      char: 't',
      description: 'Filter gateways by network type',
      options: ['evm', 'substrate'],
      helpValue: '<evm|substrate>',
      required: false,
    }),
    search: Flags.string({
      char: 's',
      description: 'Search gateways',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { type, search },
    } = await this.parse(Ls);

    const [evm, substrate] = await Promise.all([
      !type || type === 'evm' ? getEvmGateways() : [],
      !type || type === 'substrate' ? getSubstrateGateways() : [],
    ]);

    const maxNameLength = maxBy([...evm, ...substrate], (g) => g.chainName.length)?.chainName.length;

    switch (type) {
      case 'evm':
        this.processGateways(evm, { search, summary: 'EVM', maxNameLength });
        break;
      case 'substrate':
        this.processGateways(substrate, { search, summary: 'Substrate', maxNameLength });
        break;
      default:
        this.processGateways(evm, { search, summary: 'EVM', maxNameLength });
        this.log();
        this.processGateways(substrate, { search, summary: 'Substrate', maxNameLength });
    }
  }

  processGateways(
    gateways: Gateway[],
    { summary, search, maxNameLength }: { search?: string; summary?: string; maxNameLength?: number },
  ) {
    if (summary) {
      this.log(chalk.bold(summary));
    }

    gateways = search
      ? gateways.filter((g) => g.chainName.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
      : gateways;

    if (!gateways.length) {
      return this.log('No gateways found');
    }

    const table = new Table({
      wordWrap: true,
      colWidths: [maxNameLength ? maxNameLength + 2 : null],
      head: ['Name', summary === 'EVM' ? 'Chain ID' : 'SS58 Prefix', 'Release', 'Gateway URL'],
      wrapOnWordBoundary: false,

      style: {
        head: ['bold'],
        border: ['gray'],
        compact: true,
      },
    });

    gateways.map(({ chainName, chainId, chainSS58Prefix, providers }) => {
      table.push([chainName, summary === 'EVM' ? chalk.dim(chainId || '') : chalk.dim(chainSS58Prefix || ''), chalk.dim(providers[0].release), providers[0].dataSourceUrl]);
    });

    this.log(table.toString());
  }
}
