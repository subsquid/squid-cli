import { Flags } from '@oclif/core';
import { JoiSquidSlot } from '@subsquid/manifest';

export const slot = Flags.custom<string>({
  helpGroup: 'SQUID',
  char: 's',
  name: 'slot',
  description: 'Slot of the squid',
  helpValue: '<slot>',
  parse: async (input) => {
    return await JoiSquidSlot.validateAsync(input);
  },
  required: false,
  dependsOn: ['name'],
  exclusive: ['tag'],
});
