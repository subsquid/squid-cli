import { Flags } from '@oclif/core';

export const name = Flags.custom<string>({
  helpGroup: 'SQUID',
  char: 'n',
  name: 'name',
  description: 'Squid name',
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
