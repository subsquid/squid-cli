import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runCommand } from './helpers';
import { createDefaultState, MockServer, startMockServer } from './mock-server';

describe('auth', () => {
  let server: MockServer;

  beforeAll(async () => {
    server = await startMockServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should authenticate with a valid key', async () => {
    const result = await runCommand(['auth', '-k', 'test-token', '-h', server.url], server.url);

    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('Successfully logged as');
    expect(result.stdout).toContain('test@example.com');
  });

  it('should fail with an invalid key', async () => {
    const result = await runCommand(['auth', '-k', 'bad-token', '-h', server.url], server.url, 'bad-token');

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Authentication failure');
  });
});
