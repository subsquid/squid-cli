import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, resolve } from 'path';

import { Config, run } from '@oclif/core';

import type { MockOrganization, MockSquid, MockDeployment } from './mock-server';

let configCounter = 0;

export function createTestConfig(apiUrl: string, credentials: string = 'test-token'): string {
  const dir = resolve(tmpdir(), `sqd-e2e-${process.pid}-${Date.now()}-${configCounter++}`);
  const configPath = resolve(dir, 'config.json');
  mkdirSync(dir, { recursive: true });
  writeFileSync(configPath, JSON.stringify({ apiUrl, credentials }));
  return configPath;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  error?: Error;
}

export async function runCommand(args: string[], apiUrl: string, credentials?: string): Promise<RunResult> {
  const configPath = createTestConfig(apiUrl, credentials);
  const originalConfigDir = process.env.SUBSQUID_CLI_CONFIG_DIR;
  const originalApiUrl = process.env.SUBSQUID_DEFAULT_API_URL;

  process.env.SUBSQUID_CLI_CONFIG_DIR = configPath;
  process.env.SUBSQUID_DEFAULT_API_URL = apiUrl;

  const stdout: string[] = [];
  const stderr: string[] = [];

  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;

  process.stdout.write = (chunk: any, ...rest: any[]) => {
    stdout.push(typeof chunk === 'string' ? chunk : chunk.toString());
    return true;
  };
  process.stderr.write = (chunk: any, ...rest: any[]) => {
    stderr.push(typeof chunk === 'string' ? chunk : chunk.toString());
    return true;
  };

  let error: Error | undefined;
  try {
    const config = await Config.load({ root: resolve(__dirname, '../..') });
    await config.runCommand(args[0], args.slice(1));
  } catch (e: any) {
    error = e;
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;

    if (originalConfigDir !== undefined) {
      process.env.SUBSQUID_CLI_CONFIG_DIR = originalConfigDir;
    } else {
      delete process.env.SUBSQUID_CLI_CONFIG_DIR;
    }
    if (originalApiUrl !== undefined) {
      process.env.SUBSQUID_DEFAULT_API_URL = originalApiUrl;
    } else {
      delete process.env.SUBSQUID_DEFAULT_API_URL;
    }
  }

  return {
    stdout: stdout.join(''),
    stderr: stderr.join(''),
    error,
  };
}

// --- Factories ---

let squidIdCounter = 1;

export function makeOrganization(overrides: Partial<MockOrganization> = {}): MockOrganization {
  return {
    id: 'org-1',
    code: 'test-org',
    name: 'Test Organization',
    email: { address: 'org@example.com', verified: true },
    roleType: 'admin',
    status: 'ACTIVE',
    limits: {},
    billingDetails: {},
    integrations: {},
    ...overrides,
  };
}

export function makeSquid(org: MockOrganization, overrides: Partial<MockSquid> = {}): MockSquid {
  const id = squidIdCounter++;
  const name = overrides.name || 'my-squid';
  const slot = overrides.slot || 'v1';
  return {
    id,
    name,
    reference: `${name}@${slot}`,
    slot,
    description: null,
    tags: [],
    manifest: { current: { deploy: {} }, raw: '' },
    packageJson: {},
    processors: [
      {
        name: 'processor',
        status: 'SYNCED',
        syncState: { totalBlocks: 1000, currentBlock: 1000 },
      },
    ],
    addons: {},
    spec: 1,
    status: 'DEPLOYED',
    organization: { id: org.id, name: org.name, code: org.code },
    links: {
      cloudUrl: `https://cloud.sqd.dev/squids/${name}/${slot}`,
      dockerImageUrl: `eu.gcr.io/test/${name}:latest`,
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    deployedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeDeployment(org: MockOrganization, overrides: Partial<MockDeployment> = {}): MockDeployment {
  return {
    id: 1,
    type: 'DEPLOY',
    status: 'OK',
    failed: 'NO',
    logs: [],
    organization: { id: org.id, name: org.name, code: org.code },
    user: { id: 'user-1', email: 'test@example.com', fullName: 'Test User' },
    squid: { id: 1, name: 'my-squid', slot: 'v1', reference: 'my-squid@v1' },
    options: {},
    totalElapsedTimeMs: 5000,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
