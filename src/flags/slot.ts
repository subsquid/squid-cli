import { Flags } from '@oclif/core';

export const slot = Flags.custom<string>({
  helpGroup: 'SQUID',
  char: 's',
  name: 'slot',
  description: 'Slot of the squid',
  helpValue: '<slot>',
  parse: async (input) => {
    return input.toLowerCase();
  },
  required: false,
  dependsOn: ['name'],
  exclusive: ['tag'],
});
