import fs from 'fs';

import { Expression, Parser } from '@subsquid/manifest-expr';
import yaml from 'js-yaml';
import { isPlainObject, mapValues } from 'lodash';

type ManifestApi = {
  name?: string;
  cmd: string[];
  env: Record<string, unknown>;
};

type ManifestProcessor = {
  name: string;
  cmd: string[];
  env: Record<string, unknown>;
};

export interface RawManifest {
  name: string;
  version: number;
  build: null;
  deploy?: {
    env?: Record<string, unknown>;
    processor?: ManifestProcessor | ManifestProcessor[];
    api?: ManifestApi;
  };
}

export type Manifest = RawManifest;

export function readManifest(path: string, normalize = true): Manifest {
  const manifest = yaml.load(fs.readFileSync(path).toString()) as RawManifest;

  if (normalize) {
    if (manifest.deploy?.processor) {
      if (isPlainObject(manifest.deploy.processor)) {
        const processor = manifest.deploy.processor as ManifestProcessor;
        if (!processor.name) {
          processor.name = 'processor';
        }

        manifest.deploy.processor = [processor];
      } else {
        const processors = manifest.deploy.processor as ManifestProcessor[];
        manifest.deploy.processor = processors.map((p, i) => (p.name ? p : { ...p, name: `processor${i + 1}` }));
      }
    }
  }

  return manifest as Manifest;
}

export function formatManifest(manifest: RawManifest): string {
  return yaml.dump(manifest, {
    styles: {
      'tag:yaml.org,2002:null': 'empty',
    },
  });
}

export function saveManifest(path: string, manifest: RawManifest) {
  fs.writeFileSync(path, formatManifest(manifest));
}

export function evalManifestEnv(env: Record<string, any>, context: Record<string, any>) {
  const parsed = parseManifestEnv(env);

  return mapValues(parsed, (value) => (value instanceof Expression ? value.eval(context) : value));
}

export function parseManifestEnv(env: Record<string, any>) {
  const parser = new Parser();

  return mapValues(env, (value) => (typeof value === 'string' ? parser.parse(value) : value));
}
