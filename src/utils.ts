import { ConfigNotFound, getConfig } from '@subsquid/commands';
import chalk from 'chalk';

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

export type ParsedSquidFullname = { org?: string; name: string } & (
  | { ref: string; tag?: never }
  | { ref?: never; tag: string }
);

export function formatSquidFullname({ org, name, ref, tag }: ParsedSquidFullname) {
  let res = org ? `${org}/` : '';
  res += name;
  res += ref ? `@${ref}` : `:${tag}`;

  return res;
}

export const SQUID_FULLNAME_REGEXP = /^(([a-z0-9\-]+)\/)?([a-z0-9\-]+)([:@])([a-z0-9\-]+)$/;

export function parseSquidFullname(fullname: string): ParsedSquidFullname {
  const parsed = SQUID_FULLNAME_REGEXP.exec(fullname);
  if (!parsed) {
    throw new Error(`Invalid squid full name: "${fullname}"`);
  }

  const [, , org, name, type, tagOrRef] = parsed;

  return { org, name, ...(type === ':' ? { tag: tagOrRef } : { ref: tagOrRef }) };
}
