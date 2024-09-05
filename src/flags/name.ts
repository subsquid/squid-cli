import { Flags } from '@oclif/core';

export const name = Flags.custom<string>({
  helpGroup: 'COMMON',
  char: 'n',
  name: 'name',
  description: 'Squid name',
  helpValue: '<name>',
  required: false,
  parse: async (input) => {
    return input.toLowerCase();
  },
});
