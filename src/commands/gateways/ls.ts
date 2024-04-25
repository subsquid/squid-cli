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
      description: 'Filter by network type',
      options: ['evm', 'substrate'],
      helpValue: '<evm|substrate>',
      required: false,
    }),
    name: Flags.string({
      char: 'n',
      description: 'Filter by network name',
      helpValue: '<regex>',
      required: false,
    }),
    chain: Flags.string({
      char: 'c',
      description: 'Filter by chain ID or SS58 prefix',
      helpValue: '<number>',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { type, name, chain: chainId },
    } = await this.parse(Ls);

    const [evm, substrate] = await Promise.all([
      !type || type === 'evm' ? getEvmGateways() : [],
      !type || type === 'substrate' ? getSubstrateGateways() : [],
    ]);

    const maxNameLength = maxBy([...evm, ...substrate], (g) => g.chainName.length)?.chainName.length;

    switch (type) {
      case 'evm':
        this.processGateways(evm, { type, name, chainId, summary: 'EVM', maxNameLength });
        break;
      case 'substrate':
        this.processGateways(substrate, { type, name, chainId, summary: 'Substrate', maxNameLength });
        break;
      default:
        this.processGateways(evm, { type: 'evm', name, chainId, summary: 'EVM', maxNameLength });
        this.log();
        this.processGateways(substrate, { type: 'substrate', name, chainId, summary: 'Substrate', maxNameLength });
    }
  }

  processGateways(
    gateways: Gateway[],
    {
      type,
      name,
      chainId,
      summary,
      maxNameLength,
    }: { type: 'evm' | 'substrate'; name?: string; chainId?: string; summary?: string; maxNameLength?: number },
  ) {
    if (summary) {
      this.log(chalk.bold(summary));
    }

    gateways = name
      ? gateways.filter((g) => g.network.toLocaleLowerCase().match(new RegExp(name.toLocaleLowerCase())))
      : gateways;

    gateways = chainId
      ? gateways.filter((g) => (type === 'evm' ? String(g.chainId) === chainId : String(g.chainSS58Prefix) === chainId))
      : gateways;

    if (!gateways.length) {
      return this.log('No gateways found');
    }

    const headRow = ['Name', ...(type === 'evm' ? ['Chain ID'] : ['SS58 prefix']), 'Gateway URL'];
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

    gateways.map(({ chainName, chainId, chainSS58Prefix, providers }) => {
      const row = [chainName, chalk.dim(chainId || chainSS58Prefix), providers[0].dataSourceUrl];
      table.push(row);
    });

    this.log(table.toString());
  }
}
