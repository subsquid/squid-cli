import { Flags } from '@oclif/core';

import { ParsedSquidFullname, parseSquidFullname, SQUID_FULLNAME_REGEXP } from '../utils';

export const fullname = Flags.custom<ParsedSquidFullname>({
  helpGroup: 'COMMON',
  name: 'fullname',
  description: `Full name of a squid`,
  helpValue: '[<org>/]<name>(@<ref>|:<tag>)',
  required: false,
  exclusive: ['org', 'name', 'ref', 'tag'],
  parse: async (input) => {
    input = input.toLowerCase();
    if (!SQUID_FULLNAME_REGEXP.test(input)) {
      throw new Error(`Expected a squid full name but received: ${input}`);
    }

    return parseSquidFullname(input);
  },
});
