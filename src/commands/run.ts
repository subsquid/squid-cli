import assert from 'assert';
import { ChildProcess } from 'child_process';
import path from 'path';
import * as readline from 'readline';

import { Flags } from '@oclif/core';
import retryAsync from 'async-retry';
import chalk from 'chalk';
import crossSpawn from 'cross-spawn';
import dotenv from 'dotenv';
import { defaults } from 'lodash';
import treeKill from 'tree-kill';

import { CliCommand } from '../command';
import { evalManifestEnv } from '../manifest';
import { loadManifestFile } from '../manifest/loadManifestFile';

const chalkColors = [chalk.green, chalk.yellow, chalk.blue, chalk.magenta, chalk.cyan];

const chalkColorGenerator = (() => {
  let n = 0;
  return () => chalkColors[n++ % chalkColors.length];
})();

type SquidProcessOptions = {
  env?: Record<string, string>;
  cwd?: string;
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
};

class SquidProcess {
  private prefix: string;
  private child?: ChildProcess;
  private options: SquidProcessOptions;

  constructor(readonly name: string, private cmd: string[], options: Partial<SquidProcessOptions>) {
    this.prefix = chalkColorGenerator()(`[${name}]`);
    this.options = defaults(options, {
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
    });
  }

  async run({ retries }: { retries: number }) {
    await retryAsync(
      async () => {
        const result = await this.spawn();
        if (result.code && result.code > 0) {
          throw new Error(`Process ${this.prefix} failed with exit code: ${result.code}`);
        } else {
          return;
        }
      },
      {
        retries,
        factor: 1,
        onRetry: (e) => {
          console.log(e.message);
          console.log(`Process ${this.prefix} restarting...`);
        },
      },
    );
  }

  kill(signal?: string | number) {
    if (this.child?.pid) {
      treeKill(this.child.pid, signal);
      this.child = undefined;
    }
  }

  private spawn() {
    assert(!this.child);

    const [command, ...args] = this.cmd;
    const { PROCESSOR_PROMETHEUS_PORT, ...childEnv } = process.env;

    return new Promise<{ code: number | null; signal: string | null }>((resolve, reject) => {
      const child = crossSpawn(command, args, { env: { ...childEnv, ...this.options.env } });
      this.child = child;

      child.once('error', (error: Error) => {
        this.child = undefined;
        reject(error);
      });

      child.once('close', (code: number | null, signal: string | null) => {
        this.child = undefined;
        resolve({ code, signal });
      });

      if (this.child.stderr) {
        this.pipe(this.child.stderr, this.options.stderr);
      }

      if (this.child.stdout) {
        this.pipe(this.child.stdout, this.options.stdout);
      }
    });
  }

  private pipe(input: NodeJS.ReadableStream, output: NodeJS.WritableStream) {
    readline.createInterface({ input }).on('line', (line) => {
      output.write(`${this.prefix} ${line}\n`);
    });
  }
}

function isSkipped({ include, exclude }: { include?: string[]; exclude?: string[] }, haystack: string) {
  return (exclude?.length && exclude.includes(haystack)) || (include?.length && !include.includes(haystack));
}

export default class Run extends CliCommand {
  static description = 'Run a squid project locally';

  static flags = {
    manifest: Flags.string({
      char: 'm',
      description: 'Relative path to a squid manifest file',
      required: false,
      default: 'squid.yaml',
    }),
    envFile: Flags.string({
      char: 'f',
      description: 'Relative path to an additional environment file',
      required: false,
      default: '.env',
    }),
    exclude: Flags.string({ char: 'e', description: 'Do not run specified services', required: false, multiple: true }),
    include: Flags.string({
      char: 'i',
      description: 'Run only specified services',
      required: false,
      multiple: true,
      exclusive: ['exclude'],
    }),
    retries: Flags.integer({
      char: 'r',
      description: 'Attempts to restart failed or stopped services',
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
    try {
      const {
        flags: { manifest: manifestPath, envFile, exclude, include, retries },
        args: { path: squidPath },
      } = await this.parse(Run);

      const { squidDir, manifest } = loadManifestFile(squidPath, manifestPath);
      const children: SquidProcess[] = [];

      if (envFile) {
        const { error } = dotenv.config({ path: path.isAbsolute(envFile) ? envFile : path.join(squidDir, envFile) });
        if (error) this.error(error);
      }

      const context = { secrets: process.env };

      const { PROCESSOR_PROMETHEUS_PORT, ...processEnv } = process.env;
      const env = {
        FORCE_COLOR: 'true',
        FORCE_PRETTY_LOGGER: 'true',
        ...processEnv,
        ...evalManifestEnv(manifest.deploy?.env ?? {}, context),
      };

      const init = manifest.deploy?.init;
      if (init && !isSkipped({ include, exclude }, 'init')) {
        const p = new SquidProcess('init', init.cmd, {
          env: {
            ...env,
            ...evalManifestEnv(init.env ?? {}, context),
          },
          cwd: squidDir,
        });

        await p.run({ retries });
      }

      const api = manifest.deploy?.api;
      if (api && !isSkipped({ include, exclude }, 'api')) {
        children.push(
          new SquidProcess('api', api.cmd, {
            env: {
              ...env,
              ...evalManifestEnv(api.env ?? {}, context),
            },
            cwd: squidDir,
          }),
        );
      }

      if (manifest.deploy?.processor) {
        const processors = Array.isArray(manifest.deploy.processor)
          ? manifest.deploy.processor
          : [manifest.deploy.processor];

        for (const processor of processors) {
          if (isSkipped({ include, exclude }, processor.name)) continue;

          children.push(
            new SquidProcess(processor.name, processor.cmd, {
              env: {
                ...env,
                ...evalManifestEnv(processor.env ?? {}, context),
              },
              cwd: squidDir,
            }),
          );
        }
      }

      let error: Error | undefined;
      const abort = (e: Error) => {
        if (error) return;
        error = e;

        children.map((c) => c.kill());
      };

      await Promise.allSettled(children.map((c) => c.run({ retries }).catch(abort)));

      if (error) this.error(error);
    } catch (e: any) {
      this.error(e instanceof Error ? e : e);
    }
  }
}
