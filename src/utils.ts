import { Command } from '@oclif/core';
import { ConfigNotFound, getConfig } from '@subsquid/commands';

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

export function parseSquidName(squidName: string) {
  if (squidName.includes('#')) {
    const [name, slot] = squidName.split('#');
    return { name, slot };
  } else if (squidName.includes('#')) {
    const [name, tag] = squidName.split('@');
    return { name, tag };
  } else {
    throw new Error(`Invalid squid name: "${squidName}"`);
  }
}
export function formatSquidName(
  opts: { name: string; tag: string; slot?: undefined } | { name: string; slot: string; tag?: undefined },
) {
  return 'tag' in opts ? `${opts.name}@${opts.tag}` : `${opts.name}#${opts.slot}`;
}
