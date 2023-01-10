import { color } from '@oclif/color';
import { CliUx, Command, toConfiguredId } from '@oclif/core';
import { run as squidCommandRun } from '@subsquid/commands';
import Levenshtein from 'fast-levenshtein';
import { minBy, capitalize } from 'lodash';

import { getSquidCommands } from '../utils';

const TABLE_OPTIONS = {
  'no-header': true,
  'no-truncate': true,
};

const TOOLS_COMMANDS = ['docs', 'autocomplete', 'init'];

const COMMANDS_FORMAT = {
  name: {
    minWidth: 13,
    get: (c: any) => `${color.bold(c.name)}`, // ${c.aliases ? '\n' + c.aliases.join(', ') : ''}
  },
  description: {
    get: (c: any) => capitalize(c.description),
  },
};

export default class HelpCommand extends Command {
  static hidden = true;

  static summary = 'Display help for <%= config.bin %>.';
  static strict = false;

  async run(): Promise<void> {
    await this.parse(HelpCommand);

    const [id] = this.argv;
    if (!id) return await this.printHelp();

    const squidCmdConfig = await getSquidCommands();
    if (squidCmdConfig?.commands?.[id]) {
      await squidCommandRun(squidCmdConfig, this.argv);
      return;
    }

    const squidCommands = await this.getVisibleSquidCommands();

    const suggestion = this.closestCommand(id, [
      ...this.getVisibleCloudCommands().map(({ name }) => name),
      ...squidCommands.map(({ name }) => name),
    ]);
    const readableSuggestion = toConfiguredId(suggestion, this.config);
    const originalCmd = toConfiguredId(id, this.config);

    this.log(`"${originalCmd}" is not a ${this.config.bin} command.`);
    this.log(`Did you mean ${color.bold(readableSuggestion)}?`);
    this.log(color.dim(`Run ${color.bold(`${this.config.bin} help`)} for a list of available commands.`));
  }

  async printHelp() {
    this.log('Subsquid CLI tool');

    this.log();
    this.helpHeader('VERSION');
    this.log(this.config.pjson.name, color.dim(`(${this.config.pjson.version})`));

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

  helpHeader(str: string) {
    this.log(color.bold(str.toUpperCase()));
  }

  getVisibleCloudCommands(): { name: string; description?: string; aliases: string[] }[] {
    const aliases = new Set<string>();

    return this.config.commands
      .filter((c) => !c.hidden)
      .map((c) => {
        c.aliases.forEach((a) => {
          aliases.add(a);
        });

        return {
          name: c.id,
          aliases: c.aliases,
          description: c.summary || c.description,
        };
      })
      .filter((c) => !aliases.has(c.name));
  }

  closestCommand(cmd: string, commands: string[]) {
    return minBy(commands, (c) => Levenshtein.get(cmd, c))!;
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
}
