import fs from 'fs';

import yaml from 'js-yaml';
import { isPlainObject } from 'lodash';

type ManifestApi = {
  name?: string;
  cmd: string[];
  env?: Record<string, string>;
};

type ManifestProcessor = {
  name: string;
  cmd: string[];
  env?: Record<string, string>;
};

export interface RawManifest {
  name: string;
  version: number;
  build: null;
  deploy?: {
    env?: Record<string, string>;
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
