import { ConfigNotFound, getConfig } from '@subsquid/commands';
import {
  JoiSquidName,
  JoiSquidSlot,
  JoiSquidTag,
  SQUID_NAME_PATTERN,
  SQUID_SLOT_PATTERN,
  SQUID_TAG_PATTERN,
} from '@subsquid/manifest';
import chalk from 'chalk';
import Joi from 'joi';
import { PickDeep } from 'type-fest';

import { Squid } from './api';
import { org } from './flags';

export async function getSquidCommands() {
  try {
    return await getConfig();
  } catch (e) {
    if (e instanceof ConfigNotFound) {
      return null;
    }

    throw e;
  }
}

export async function doUntil(fn: () => Promise<boolean>, { pause }: { pause: number }) {
  while (true) {
    const done = await fn();
    if (done) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, pause));
  }
}

export type ParsedSquidReference = { org?: string; name: string } & (
  | { slot: string; tag?: never }
  | { slot?: never; tag: string }
  | { slot: string; tag: string }
);

export function formatSquidReference(
  reference: ParsedSquidReference | string,
  { colored }: { colored?: boolean } = {},
) {
  const { org, name, slot, tag } = typeof reference === 'string' ? parseSquidReference(reference) : reference;

  const prefix = org ? `${org}/` : ``;
  const suffix = slot ? `@${slot}` : `:${tag}`;

  return colored ? chalk`{bold {green ${prefix}}{green ${name}}{blue ${suffix}}}` : `${prefix}${name}${suffix}`;
}

export const SQUID_FULLNAME_REGEXP = /^((.+)\/)?(.+)([@:])(.+)$/;

export const JoiSquidReference = Joi.object({
  org: JoiSquidName,
  name: JoiSquidName.required(),
  slot: JoiSquidSlot,
  tag: JoiSquidTag,
}).xor('slot', 'tag');

export function parseSquidReference(reference: string): ParsedSquidReference {
  const parsed = SQUID_FULLNAME_REGEXP.exec(reference);
  if (!parsed) {
    throw new Error(`The squid reference "${reference}" is invalid.`);
  }

  const [, , org, name, type, tagOrSlot] = parsed;

  // the last case should never happen, used only for flag validation
  return { org, name, ...(type === ':' ? { tag: tagOrSlot } : type === '@' ? { slot: tagOrSlot } : ({} as any)) };
}

export function printSquid(squid: PickDeep<Squid, 'name' | 'slot' | 'organization.code'>) {
  return formatSquidReference({ org: squid.organization.code, name: squid.name, slot: squid.slot }, { colored: true });
}
