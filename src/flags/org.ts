import { Flags } from '@oclif/core';

export const org = Flags.custom<string>({
  helpGroup: 'ORG',
  char: 'o',
  name: 'org',
  description: 'Code of the organization',
  helpValue: '<code>',
  required: false,
  parse: async (input) => {
    return input.toLowerCase();
  },
});
