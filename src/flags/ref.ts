import { Flags } from '@oclif/core';

export const ref = Flags.custom<string>({
  helpGroup: 'COMMON',
  char: 'r',
  name: 'ref',
  description: 'Squid ref',
  helpValue: '<ref>',
  parse: async (input) => {
    return input.toLowerCase();
  },
  required: false,
});
