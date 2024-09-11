import { Flags } from '@oclif/core';

export const tag = Flags.custom<string>({
  helpGroup: 'SQUID',
  char: 't',
  name: 'tag',
  description: 'Tag of the squid',
  helpValue: '<tag>',
  required: false,
  parse: async (input) => {
    return input.toLowerCase();
  },
  dependsOn: ['name'],
  exclusive: ['slot'],
});
