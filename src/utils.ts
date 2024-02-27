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

export function parseNameAndVersion(
  nameAndVersion: string,
  command: Command,
): {
  squidName: string;
  versionName: string;
} {
  if ((nameAndVersion.match(/.+@.+/gi) || []).length === 0 || (nameAndVersion.match(/@/g) || []).length !== 1) {
    command.error('Required format: <name>@<version>. Symbol @ not allowed in names');
  }
  const squidName = nameAndVersion.split('@')[0];
  const versionName = nameAndVersion.split('@')[1];
  return { squidName, versionName };
}
