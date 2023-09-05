import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import path from 'path';
import * as readline from 'readline';
import { Writable } from 'stream';

import { Flags } from '@oclif/core';
import chalk from 'chalk';
import dotenv from 'dotenv';
import tkill from 'tree-kill';

import { CliCommand } from '../command';
import { loadManifestFile } from '../manifest/loadManifestFile';

const chalkColors = [chalk.green, chalk.yellow, chalk.blue, chalk.magenta, chalk.cyan];

function chalkColorGenerator() {
  let n = 0;

  return () => chalkColors[n++ % chalkColors.length];
}

const procColor = chalkColorGenerator();

interface SquidProcess {
  manifestProcess: {
    name: string;
    cmd: string[];
    env: Record<string, string>;
  };
  process: ChildProcessWithoutNullStreams;
  restartsCount: number;
}

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

  const prefix = procColor()(`[${name}] `);

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
    retries: Flags.integer({
      char: 'r',
      description: 'Attepms to restart failed or stopped services',
      required: false,
      default: 5,
    }),
  };

  static args = [
    {
      name: 'path',
      required: true,
      hidden: false,
      default: '.',
    },
  ];

  async run(): Promise<void> {
    const {
      flags: { manifest: manifestPath, envFile, exclude, include, retries },
      args: { path: squidPath },
    } = await this.parse(Run);

    try {
      const { squidDir, manifest } = loadManifestFile(squidPath, manifestPath);

      const runner = { cwd: squidDir, output: process.stdout };

      const children: SquidProcess[] = [];

      if (envFile) {
        const { error } = dotenv.config({
          path: path.isAbsolute(envFile) ? envFile : path.join(squidDir, '/', envFile),
        });
        if (error) {
          this.error(error);
        }
      }

      if (manifest.deploy?.api && !isSkipped({ include, exclude }, 'api')) {
        const manifestProcess = {
          name: 'api',
          ...manifest.deploy.api,
        };

        children.push({
          manifestProcess,
          process: runProcess(runner, manifestProcess),
          restartsCount: 0,
        });
      }

      if (manifest.deploy?.processor) {
        const processors = Array.isArray(manifest.deploy.processor)
          ? manifest.deploy.processor
          : [manifest.deploy.processor];

        for (const processor of processors) {
          if (isSkipped({ include, exclude }, processor.name)) {
            continue;
          }

          children.push({
            manifestProcess: processor,
            process: runProcess(runner, processor),
            restartsCount: 0,
          });
        }
      }

      children.forEach((c) => {
        const onProcessExit = (code: number) => {
          if (code != null) console.log(`${c.manifestProcess.name} exited with code ${code}`);
          if (code === 0) return;
          if (c.restartsCount < retries) {
            c.process = runProcess(runner, c.manifestProcess);
            c.process.on('exit', onProcessExit);
            c.restartsCount++;
          } else {
            children.forEach((cc) => {
              cc.restartsCount = retries;
              if (cc.process.pid) {
                tkill(cc.process.pid, 'SIGKILL');
              }
            });
          }
        };

        c.process.on('exit', onProcessExit);
      });
    } catch (e: any) {
      this.error(e.message);
    }
  }
}
