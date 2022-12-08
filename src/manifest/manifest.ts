import fs from 'fs';

import yaml from 'js-yaml';

export type Manifest = {
  name: string;
  version: number;
  build: null;
};

export function readManifest(path: string) {
  return yaml.load(fs.readFileSync(path).toString()) as Manifest;
}

export function formatManifest(manifest: Manifest): string {
  return yaml.dump(manifest, {
    styles: {
      'tag:yaml.org,2002:null': 'empty',
    },
  });
}

export function saveManifest(path: string, manifest: Manifest) {
  fs.writeFileSync(path, formatManifest(manifest));
}
