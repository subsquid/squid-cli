import { Flags } from '@oclif/core';

export const name = Flags.custom<string>({
  helpGroup: 'SQUID',
  char: 'n',
  name: 'name',
  description: 'Name of the squid',
  helpValue: '<name>',
  required: false,
  parse: async (input) => {
    return input.toLowerCase();
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
