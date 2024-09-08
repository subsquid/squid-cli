import { Flags } from '@oclif/core';

export const slot = Flags.custom<string>({
  helpGroup: 'COMMON',
  char: 's',
  name: 'slot',
  description: 'Squid slot',
  helpValue: '<slot>',
  parse: async (input) => {
    return input.toLowerCase();
  },
  required: false,
});
