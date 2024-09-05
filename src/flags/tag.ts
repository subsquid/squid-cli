import { Flags } from '@oclif/core';

export const tag = Flags.custom<string>({
  helpGroup: 'COMMON',
  char: 't',
  name: 'tag',
  description: 'Squid tag',
  helpValue: '<tag>',
  required: false,
  parse: async (input) => {
    return input.toLowerCase();
  },
});
