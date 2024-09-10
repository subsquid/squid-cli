import { ConfigNotFound, getConfig } from '@subsquid/commands';
import chalk from 'chalk';
import { PickDeep } from 'type-fest';

import { Squid } from './api';

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

export const SQUID_FULLNAME_REGEXP = /^(([a-z0-9\-]+)\/)?([a-z0-9\-]+)([:@])([a-z0-9\-]+)$/;

export function parseSquidReference(reference: string): ParsedSquidReference {
  const parsed = SQUID_FULLNAME_REGEXP.exec(reference);
  if (!parsed) {
    throw new Error(`Invalid squid full name: "${reference}"`);
  }

  const [, , org, name, type, tagOrSlot] = parsed;

  return { org, name, ...(type === ':' ? { tag: tagOrSlot } : { slot: tagOrSlot }) };
}

export function printSquid(squid: PickDeep<Squid, 'name' | 'slot' | 'organization.code'>) {
  return formatSquidReference({ org: squid.organization.code, name: squid.name, slot: squid.slot }, { colored: true });
}
