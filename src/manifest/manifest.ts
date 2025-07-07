import fs from 'fs';
import path from 'path';

import { Manifest } from '@subsquid/manifest';
import { mapValues } from 'lodash';

export function readManifest(path: string) {
  return fs.readFileSync(path).toString();
}

export function saveManifest(path: string, manifest: string) {
  fs.writeFileSync(path, manifest);
}

export function loadManifestFile(
  localPath: string,
  manifestPath: string,
): { squidDir: string; manifest: Manifest; manifestRaw: string } {
  const squidDir = path.resolve(localPath);

  if (!fs.statSync(squidDir).isDirectory()) {
    throw new Error(
      [
        `The provided path is not a directory`,
        ``,
        `Squid directory    ${squidDir}`,
        ``,
        `Please provide a path to the root of a squid directory`,
        ``,
      ].join('\n'),
    );
  }

  const manifestFullPath = path.isAbsolute(manifestPath)
    ? manifestPath
    : path.resolve(path.join(localPath, manifestPath));

  if (!fs.existsSync(manifestFullPath)) {
    throw new Error(
      [
        `The manifest file is not found`,
        ``,
        `Manifest path     ${manifestFullPath}`,
        ``,
        `Please provide a path to a valid manifest inside the squid directory using "-m" flag`,
        ``,
      ].join('\n'),
    );
  }

  if (!manifestFullPath.startsWith(squidDir)) {
    throw new Error(
      [
        `The manifest is located outside the squid directory.`,
        ``,
        `Squid directory    ${squidDir}`,
        `Manifest           ${manifestFullPath}`,
        ``,
        `To fix the problem, please`,
        `  — check the squid directory is correct`,
        `  — move manifest inside into the squid directory`,
        ``,
      ].join('\n'),
    );
  }

  if (fs.statSync(manifestFullPath).isDirectory()) {
    throw new Error(
      [
        `The path ${manifestFullPath} is a directory, not a manifest file`,
        `Please provide a path to a valid manifest inside squid directory using -m flag `,
      ].join('\n'),
    );
  }

  let manifest: Manifest;
  let manifestRaw: string;
  try {
    manifestRaw = fs.readFileSync(manifestFullPath).toString();
    const { value, error } = Manifest.parse(manifestRaw, { validation: { allowUnknown: true } });
    if (error) {
      throw error;
    }
    manifest = value;
  } catch (e: any) {
    throw new Error(
      `The manifest file on ${manifestFullPath} can not be parsed: ${e instanceof Error ? e.message : e}`,
    );
  }
  return {
    squidDir,
    manifest,
    manifestRaw,
  };
}
