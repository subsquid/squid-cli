import { Hook, toConfiguredId } from '@oclif/core';
import { run as squidCommandRun } from '@subsquid/commands/lib/run';
import chalk from 'chalk';
import Levenshtein from 'fast-levenshtein';
import { minBy } from 'lodash';

import Help from '../help';
import { getSquidCommands } from '../utils';

function closestCommand(cmd: string, commands: string[]) {
  return minBy(commands, (c) => Levenshtein.get(cmd, c))!;
}

const hook: Hook<'command_not_found'> = async function ({ id, argv, config }) {
  const squidCmdConfig = await getSquidCommands();
  if (squidCmdConfig?.commands?.[id]) {
    process.exit(await squidCommandRun(squidCmdConfig, id, (argv || []).slice(1)));
  }

  const squidCommands = await Help.getVisibleSquidCommands();
  const suggestion = closestCommand(id, [
    ...Help.getVisibleCloudCommands(config).map(({ name }) => name),
    ...squidCommands.map(({ name }) => name),
  ]);
  const readableSuggestion = toConfiguredId(suggestion, config);

  this.log(`"${id}" is not a ${config.bin} command.`);
  this.log(`Did you mean "${readableSuggestion}"?`);
  this.log(chalk.dim(`Run "${config.bin} help" for a list of available commands.`));
};

export default hook;
