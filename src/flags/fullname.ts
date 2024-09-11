import { Flags } from '@oclif/core';

import { ParsedSquidReference, parseSquidReference, SQUID_FULLNAME_REGEXP } from '../utils';

export const fullname = Flags.custom<ParsedSquidReference>({
  helpGroup: 'SQUID',
  name: 'fullname',
  aliases: ['ref'],
  description: `Fully qualified reference of the squid. It can include the organization, name, slot, or tag`,
  helpValue: '[<org>/]<name>(@<slot>|:<tag>)',
  required: false,
  exclusive: ['org', 'name', 'slot', 'tag'],
  parse: async (input) => {
    input = input.toLowerCase();
    if (!SQUID_FULLNAME_REGEXP.test(input)) {
      throw new Error(`Expected full name of the squid but received: ${input}`);
    }

    return parseSquidReference(input);
  },
});
