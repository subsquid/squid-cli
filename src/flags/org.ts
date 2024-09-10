import { Flags } from '@oclif/core';

export const org = Flags.custom<string>({
  helpGroup: 'ORG',
  char: 'o',
  name: 'org',
  description: 'Organization code',
  helpValue: '<code>',
  required: false,
  parse: async (input) => {
    return input.toLowerCase();
  },
});
