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
    id: Flags.string({
      char: 'i',
      description: 'Search by id',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { type, search, id: chainId },
    } = await this.parse(Ls);

    const [evm, substrate] = await Promise.all([
      !type || type === 'evm' || chainId ? getEvmGateways() : [],
      !chainId && (!type || type === 'substrate') ? getSubstrateGateways() : [],
    ]);

    const maxNameLength = maxBy([...evm, ...substrate], (g) => g.chainName.length)?.chainName.length;

    switch (type) {
      case 'evm':
        this.processGateways(evm, { search, summary: 'EVM', chainId, maxNameLength });
        break;
      case 'substrate':
        this.processGateways(substrate, { search, summary: 'Substrate', maxNameLength });
        break;
      default:
        this.processGateways(evm, { search, summary: 'EVM', chainId, maxNameLength });
        this.log();
        this.processGateways(substrate, { search, summary: 'Substrate', maxNameLength });
    }
  }

  processGateways(
    gateways: Gateway[],
    {
      search,
      summary,
      chainId,
      maxNameLength,
    }: { search?: string; summary?: string; chainId?: string; maxNameLength?: number },
  ) {
    if (summary) {
      this.log(chalk.bold(summary));
    }

    gateways = search
      ? gateways.filter((g) => g.chainName.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
      : gateways;

    if (summary === 'EVM' && chainId) gateways = gateways.filter((g) => String(g.chainId) === chainId);

    if (!gateways.length) {
      return this.log('No gateways found');
    }

    const headRow = ['Name', 'Release', 'Gateway URL'];
    if (summary === 'EVM') headRow.splice(1, 0, 'Chain ID');
    const table = new Table({
      wordWrap: true,
      colWidths: [maxNameLength ? maxNameLength + 2 : null],
      head: headRow,
      wrapOnWordBoundary: false,

      style: {
        head: ['bold'],
        border: ['gray'],
        compact: true,
      },
    });

    gateways.map(({ chainName, chainId, providers }) => {
      const row = [chainName, chalk.dim(providers[0].release), providers[0].dataSourceUrl];
      if (summary === 'EVM') row.splice(1, 0, chalk.dim(chainId || ''));
      table.push(row);
    });

    this.log(table.toString());
  }
}
