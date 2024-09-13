import { Flags } from '@oclif/core';
import { JoiSquidTag } from '@subsquid/manifest';

export const tag = Flags.custom<string>({
  helpGroup: 'SQUID',
  char: 't',
  name: 'tag',
  description: 'Tag of the squid',
  helpValue: '<tag>',
  required: false,
  parse: async (input) => {
    return await JoiSquidTag.validateAsync(input);
  },
  dependsOn: ['name'],
  exclusive: ['slot'],
});
