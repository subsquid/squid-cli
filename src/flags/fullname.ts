import { Flags } from '@oclif/core';

import { ParsedSquidFullname, parseSquidFullname, SQUID_FULLNAME_REGEXP } from '../utils';

export const fullname = Flags.custom<ParsedSquidFullname>({
  helpGroup: 'COMMON',
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

    return parseSquidFullname(input);
  },
});
