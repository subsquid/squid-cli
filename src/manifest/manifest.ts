import fs from 'fs';

import yaml from 'js-yaml';
import { isPlainObject } from 'lodash';

type ManifestApi = {
  cmd: string[];
  env: Record<string, string>;
};

type ManifestProcessor = {
  name: string;
  cmd: string[];
  env: Record<string, string>;
};

export interface RawManifest {
  name: string;
  version: number;
  build: null;
  deploy?: {
    processor?: ManifestProcessor | ManifestProcessor[];
    api?: ManifestApi;
  };
}

export interface Manifest extends RawManifest {
  deploy?: {
    api?: ManifestApi;
    processor?: ManifestProcessor[];
  };
}

export function readManifest(path: string, transform = true): Manifest {
  const manifest = yaml.load(fs.readFileSync(path).toString()) as RawManifest;

  if (transform) {
    if (manifest.deploy?.processor && isPlainObject(manifest.deploy.processor)) {
      manifest.deploy.processor = [manifest.deploy.processor as ManifestProcessor];
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
