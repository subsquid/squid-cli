import fs from 'fs';
import path from 'path';

import chalk from 'chalk';
import yaml from 'js-yaml';

import { Manifest } from './manifest';

export function loadManifestFile(localPath: string, manifestPath: string): { squidDir: string; manifest: Manifest } {
  const squidDir = path.resolve(localPath);

  if (!fs.statSync(squidDir).isDirectory()) {
    throw new Error(`The path ${squidDir} is a not a squid directory. Please provide a path to a squid root directory`);
  }

  const manifestFullPath = path.resolve(path.join(localPath, manifestPath));
  if (fs.statSync(manifestFullPath).isDirectory()) {
    throw new Error(
      `The path ${manifestFullPath} is a directory, not a manifest file. Please provide a path to a valid manifest file inside squid directory`,
    );
  }

  let manifestValue;
  try {
    manifestValue = yaml.load(fs.readFileSync(manifestFullPath).toString()) as Manifest;
  } catch (e: any) {
    throw new Error(`The manifest file on ${manifestFullPath} can not be parsed: ${e.message}`);
  }

  if (!manifestValue.name) {
    throw new Error(`A Squid  ${chalk.bold('name')} must be specified in the manifest`);
  } else if (manifestValue.version < 1) {
    throw new Error(`A Squid ${chalk.bold('version')} must be greater than 0`);
  } else if (!manifestValue.version) {
    throw new Error(`A Squid ${chalk.bold('version')} must be specified in the manifest`);
  }

  return {
    squidDir,
    manifest: manifestValue,
  };
}
