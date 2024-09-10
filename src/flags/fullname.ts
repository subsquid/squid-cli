import { Flags } from '@oclif/core';

import { ParsedSquidReference, parseSquidReference, SQUID_FULLNAME_REGEXP } from '../utils';

export const fullname = Flags.custom<ParsedSquidReference>({
  helpGroup: 'SQUID',
  name: 'fullname',
  aliases: ['ref'],
  description: `Reference of a squid`,
  helpValue: '[<org>/]<name>(@<slot>|:<tag>)',
  required: false,
  exclusive: ['org', 'name', 'slot', 'tag'],
  parse: async (input) => {
    input = input.toLowerCase();
    if (!SQUID_FULLNAME_REGEXP.test(input)) {
      throw new Error(`Expected a squid reference name but received: ${input}`);
    }

    return parseSquidReference(input);
  },
});
