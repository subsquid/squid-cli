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

export const SQUID_HASH_SYMBOL = ':';
export const SQUID_TAG_SYMBOL = '@';

export function parseSquidReference(reference: string) {
  if (reference.includes(SQUID_HASH_SYMBOL)) {
    const [name, hash] = reference.split(SQUID_HASH_SYMBOL);
    return { name, hash };
  } else if (reference.includes(SQUID_TAG_SYMBOL)) {
    const [name, tag] = reference.split(SQUID_TAG_SYMBOL);
    return { name, tag };
  }

  throw new Error(`Invalid squid reference: "${reference}"`);
}

export function formatSquidName({ reference }: { reference: string }) {
  return chalk.bold(reference);
}
