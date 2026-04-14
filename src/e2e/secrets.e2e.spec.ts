import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { makeOrganization, runCommand } from './helpers';
import { createDefaultState, MockServer, MockState, startMockServer } from './mock-server';

describe('secrets', () => {
  let server: MockServer;
  let state: MockState;

  beforeAll(async () => {
    state = createDefaultState();
    server = await startMockServer(state);
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    const org = makeOrganization();
    state.organizations = [org];
    state.secrets = {};
  });

  it('should list secrets', async () => {
    state.secrets['test-org'] = { DB_PASSWORD: '***', API_KEY: '***' };

    const result = await runCommand(['secrets:list', '--org', 'test-org', '--no-interactive'], server.url);

    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('DB_PASSWORD');
    expect(result.stdout).toContain('API_KEY');
  });

  it('should show message when no secrets exist', async () => {
    const result = await runCommand(['secrets:list', '--org', 'test-org', '--no-interactive'], server.url);

    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('There are no secrets');
  });

  it('should set a secret', async () => {
    const result = await runCommand(
      ['secrets:set', 'MY_SECRET', 'my-value', '--org', 'test-org', '--no-interactive'],
      server.url,
    );

    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('MY_SECRET');
    expect(state.secrets['test-org']['MY_SECRET']).toBe('my-value');
  });

  it('should remove a secret', async () => {
    state.secrets['test-org'] = { TO_DELETE: 'value' };

    const result = await runCommand(
      ['secrets:remove', 'TO_DELETE', '--org', 'test-org', '--no-interactive'],
      server.url,
    );

    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain("Secret 'TO_DELETE' removed");
    expect(state.secrets['test-org']['TO_DELETE']).toBeUndefined();
  });
});
