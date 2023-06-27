import { spawn } from 'child_process';
import path from 'path';
import * as readline from 'readline';
import { Writable } from 'stream';

import { Flags } from '@oclif/core';
import chalk from 'chalk';
import dotenv from 'dotenv';

import { CliCommand } from '../command';
import { loadManifestFile } from '../manifest/loadManifestFile';

function runProcess(
  { cwd, output }: { cwd: string; output: Writable },
  { name, cmd, env }: { name: string; cmd: string[]; env: Record<string, string> },
) {
  const [command, ...args] = cmd;
  const { PROCESSOR_PROMETHEUS_PORT, ...childEnv } = process.env;

  const child = spawn(command, args, {
    env: {
      ...childEnv,
      ...env,
      FORCE_COLOR: 'true',
      FORCE_PRETTY_LOGGER: 'true',
    },
    cwd,
    shell: process.platform === 'win32',
  });

  const prefix = chalk.magenta(`[${name}] `);

  readline
    .createInterface({
      input: child.stderr,
    })
    .on('line', (line) => {
      output.write(`${prefix}${line}\n`);
    });
  readline
    .createInterface({
      input: child.stdout,
    })
    .on('line', (line) => {
      output.write(`${prefix}${line}\n`);
    });

  child.once('exit', (code) => {
    process.exit(code || 0);
  });

  return child;
}

function isSkipped({ include, exclude }: { include?: string[]; exclude?: string[] }, haystack: string) {
  if (exclude?.length && exclude.includes(haystack)) return true;
  else if (include?.length && !include.includes(haystack)) return true;

  return false;
}

export default class Run extends CliCommand {
  static description = 'Run a squid';

  static flags = {
    manifest: Flags.string({
      char: 'm',
      description: 'Relative path to a squid manifest file in squid source',
      required: false,
      default: 'squid.yaml',
    }),
    envFile: Flags.string({
      char: 'f',
      description: 'Relative path to an additional environment file in squid source',
      required: false,
      default: '.env',
    }),
    exclude: Flags.string({
      char: 'e',
      description: 'Do not run specified services',
      required: false,
      multiple: true,
    }),
    include: Flags.string({
      char: 'i',
      description: 'Run only specified services',
      required: false,
      multiple: true,
      exclusive: ['exclude'],
    }),
  };

  static args = [
    {
      name: 'path',
      required: true,
      hidden: true,
      default: '.',
    },
  ];

  async run(): Promise<void> {
    const {
      flags: { manifest: manifestPath, envFile, exclude, include },
      args: { path: squidPath },
    } = await this.parse(Run);

    try {
      const { squidDir, manifest } = loadManifestFile(squidPath, manifestPath);
      const runner = { cwd: squidDir, output: process.stdout };

      if (envFile) {
        const { error } = dotenv.config({
          path: path.join(squidDir, '/', envFile),
        });
        if (error) {
          this.error(error);
        }
      }

      if (manifest.deploy?.api && !isSkipped({ include, exclude }, 'api')) {
        runProcess(runner, {
          name: 'api',
          ...manifest.deploy.api,
        });
      }

      if (manifest.deploy?.processor) {
        for (const processor of manifest.deploy?.processor) {
          if (isSkipped({ include, exclude }, processor.name)) {
            continue;
          }

          runProcess(runner, processor);
        }
      }
    } catch (e: any) {
      this.error(e.message);
    }
  }
}
