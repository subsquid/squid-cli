import { Command, toConfiguredId } from '@oclif/core';
import { run as squidCommandRun } from '@subsquid/commands';
import chalk from 'chalk';
import Levenshtein from 'fast-levenshtein';
import { minBy } from 'lodash';

import Help from '../help';
import { getSquidCommands } from '../utils';

export default class DefaultCommand extends Command {
  static hidden = true;

  static description = 'Display help or run squid commands';
  static strict = false;

  async run(): Promise<void> {
    await this.parse(DefaultCommand);
    const help = new Help(this.config);

    const [id] = this.argv;
    if (!id || (id === 'help' && this.argv.length === 1)) return await help.printHelp();

    const squidCmdConfig = await getSquidCommands();
    if (squidCmdConfig?.commands?.[id]) {
      process.exit(await squidCommandRun(squidCmdConfig, id, this.argv.slice(1)));
    }

    const squidCommands = await help.getVisibleSquidCommands();

    const suggestion = this.closestCommand(id, [
      ...help.getVisibleCloudCommands().map(({ name }) => name),
      ...squidCommands.map(({ name }) => name),
    ]);
    const readableSuggestion = toConfiguredId(suggestion, this.config);
    const originalCmd = toConfiguredId(this.argv.filter((c) => !c.startsWith('-')).join(' '), this.config);

    this.log(`"${originalCmd}" is not a ${this.config.bin} command.`);
    this.log(`Did you mean "${readableSuggestion}"?`);
    this.log(chalk.dim(`Run "${this.config.bin} help" for a list of available commands.`));
  }

  closestCommand(cmd: string, commands: string[]) {
    return minBy(commands, (c) => Levenshtein.get(cmd, c))!;
  }
}
