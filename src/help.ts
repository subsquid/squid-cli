import { CliUx, Help as OclifHelp } from '@oclif/core';
import chalk from 'chalk';

import DefaultCommand from './commands/default';
import { getSquidCommands } from './utils';

const TABLE_OPTIONS = {
  'no-header': true,
  'no-truncate': true,
};

const TOOLS_COMMANDS = ['docs', 'autocomplete', 'init'];

function capitalizeFirstLetter(val: string | undefined) {
  if (!val) return null;

  return val.charAt(0).toUpperCase() + val.slice(1);
}

const COMMANDS_FORMAT = {
  name: {
    minWidth: 13,
    get: (c: any) => `${c.name}`, // ${c.aliases ? '\n' + c.aliases.join(', ') : ''}
  },
  description: {
    get: (c: any) => capitalizeFirstLetter(c.description),
  },
};

export default class Help extends OclifHelp {
  async showCommandHelp(command: any) {
    if (command.id === 'default') {
      await DefaultCommand.run(command.args);
      return;
    }

    await super.showCommandHelp(command);
  }

  async showHelp(argv: any) {
    const squidCommands = await this.getVisibleSquidCommands();

    if (squidCommands.find((c) => c.name === argv[0])) {
      await DefaultCommand.run(argv);
      return;
    }

    super.showHelp(argv);
  }

  async printHelp() {
    this.log('Subsquid CLI tool');

    this.log();
    this.helpHeader('VERSION');
    this.log(this.config.pjson.name, chalk.dim(`(${this.config.pjson.version})`));

    this.log();
    this.helpHeader('CLOUD COMMANDS');

    const commands = this.getVisibleCloudCommands();
    CliUx.ux.table(
      commands.filter((c) => !TOOLS_COMMANDS.includes(c.name)),
      COMMANDS_FORMAT,
      TABLE_OPTIONS,
    );

    const squidCommands = await this.getVisibleSquidCommands();
    if (squidCommands.length !== 0) {
      this.log();
      this.helpHeader('SQUID COMMANDS');

      CliUx.ux.table(squidCommands, COMMANDS_FORMAT, TABLE_OPTIONS);
    }

    this.log();
    this.helpHeader('TOOLS');

    CliUx.ux.table(
      commands.filter((c) => TOOLS_COMMANDS.includes(c.name)),
      COMMANDS_FORMAT,
      TABLE_OPTIONS,
    );
  }

  async getVisibleSquidCommands(): Promise<{ name: string; description?: string }[]> {
    const config = await getSquidCommands();
    if (!config) return [];

    return Object.entries(config.commands || {})
      .filter(([, cmd]) => !cmd.hidden)
      .map(([name, cmd]) => ({
        name,
        description: cmd.description,
      }));
  }

  getVisibleCloudCommands(): { name: string; description?: string; aliases: string[] }[] {
    const aliases = new Set<string>();

    return this.config.commands
      .filter((c) => !c.hidden)
      .map((c) => {
        c.aliases.forEach((a) => {
          aliases.add(a);
        });

        const [description] = (c.summary || c.description || '').split('\n');

        return {
          name: c.id,
          aliases: c.aliases,
          description: description,
        };
      })
      .filter((c) => !aliases.has(c.name));
  }

  helpHeader(str: string) {
    this.log(chalk.bold(str.toUpperCase()));
  }
}
