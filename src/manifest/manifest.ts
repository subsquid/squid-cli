import fs from 'fs';
import path from 'path';

import { Manifest, ManifestValue } from '@subsquid/manifest';
import { Expression, Parser } from '@subsquid/manifest-expr';
import yaml from 'js-yaml';
import { isPlainObject, mapValues } from 'lodash';

export function readManifest(path: string) {
  return yaml.load(fs.readFileSync(path).toString()) as Partial<ManifestValue>;
}

export function saveManifest(path: string, manifest: Partial<ManifestValue>) {
  fs.writeFileSync(path, formatManifest(manifest));
}

export function formatManifest(manifest: Partial<ManifestValue>): string {
  return yaml.dump(manifest, {
    styles: {
      'tag:yaml.org,2002:null': 'empty',
    },
  });
}

export function evalManifestEnv(env: Record<string, any>, context: Record<string, any>) {
  const parsed = parseManifestEnv(env);

  return mapValues(parsed, (value) => (value instanceof Expression ? value.eval(context) : value));
}

export function parseManifestEnv(env: Record<string, any>) {
  const parser = new Parser();

  return mapValues(env, (value) => (typeof value === 'string' ? parser.parse(value) : value));
}

export function loadManifestFile(
  localPath: string,
  manifestPath: string,
): { squidDir: string; manifest: ManifestValue } {
  const squidDir = path.resolve(localPath);

  if (!fs.statSync(squidDir).isDirectory()) {
    throw new Error(`The path ${squidDir} is a not a squid directory. Please provide a path to a squid root directory`);
  }

  const manifestFullPath = path.isAbsolute(manifestPath)
    ? manifestPath
    : path.resolve(path.join(localPath, manifestPath));
  if (fs.statSync(manifestFullPath).isDirectory()) {
    throw new Error(
      `The path ${manifestFullPath} is a directory, not a manifest file. Please provide a path to a valid manifest file inside squid directory`,
    );
  }

  let manifest;
  try {
    const raw = fs.readFileSync(manifestFullPath).toString();
    manifest = Manifest.parse(raw);
  } catch (e: any) {
    throw new Error(
      `The manifest file on ${manifestFullPath} can not be parsed: ${e instanceof Error ? e.message : e}`,
    );
  }

  if (manifest.hasError()) {
    throw new Error(manifest.getErrors().join('\n'));
  }

  return {
    squidDir,
    manifest: manifest.values() as ManifestValue,
  };
}
