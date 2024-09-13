import { Flags } from '@oclif/core';
import Joi from 'joi';

import { JoiSquidReference, ParsedSquidReference, parseSquidReference, SQUID_FULLNAME_REGEXP } from '../utils';

export const reference = Flags.custom<ParsedSquidReference>({
  char: 'r',
  helpGroup: 'SQUID',
  name: 'reference',
  aliases: ['ref'],
  description: `Fully qualified reference of the squid. It can include the organization, name, slot, or tag`,
  helpValue: '[<org>/]<name>(@<slot>|:<tag>)',
  required: false,
  exclusive: ['org', 'name', 'slot', 'tag'],
  parse: async (input) => {
    const res = parseSquidReference(input);
    return await JoiSquidReference.validateAsync(res);
  },
});
