import { Flags } from '@oclif/core';
import { JoiSquidName } from '@subsquid/manifest';

export const name = Flags.custom<string>({
  helpGroup: 'SQUID',
  char: 'n',
  name: 'name',
  description: 'Name of the squid',
  helpValue: '<name>',
  required: false,
  parse: async (input) => {
    return await JoiSquidName.validateAsync(input);
  },
  relationships: [
    {
      type: 'some',
      flags: [
        { name: 'slot', when: async (flags) => !flags['tag'] },
        { name: 'tag', when: async (flags) => !flags['slot'] },
      ],
    },
  ],
});
