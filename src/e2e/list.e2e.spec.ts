import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { makeOrganization, makeSquid, runCommand } from './helpers';
import { createDefaultState, MockServer, MockState, startMockServer } from './mock-server';

describe('list', () => {
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
    state.organizations = [];
    state.squids = [];
  });

  it('should list squids in table format', async () => {
    const org = makeOrganization();
    state.organizations.push(org);
    state.squids.push(
      makeSquid(org, { name: 'squid-a', slot: 'v1', tags: [{ name: 'prod' }], status: 'DEPLOYED' }),
      makeSquid(org, { name: 'squid-b', slot: 'v2', status: 'DEPLOYING' }),
    );

    const result = await runCommand(['ls', '--org', 'test-org', '--no-interactive'], server.url);

    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('squid-a');
    expect(result.stdout).toContain('squid-b');
    expect(result.stdout).toContain('prod');
    expect(result.stdout).toContain('DEPLOYED');
    expect(result.stdout).toContain('DEPLOYING');
  });

  it('should list squids in JSON format', async () => {
    const org = makeOrganization();
    state.organizations.push(org);
    state.squids.push(makeSquid(org, { name: 'squid-json', slot: 'v1', status: 'DEPLOYED' }));

    const result = await runCommand(['ls', '--org', 'test-org', '--no-interactive', '--json'], server.url);

    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toBeInstanceOf(Array);
    expect(parsed[0].name).toBe('squid-json');
  });

  it('should show nothing for empty organization', async () => {
    const org = makeOrganization();
    state.organizations.push(org);

    const result = await runCommand(['ls', '--org', 'test-org', '--no-interactive'], server.url);

    expect(result.error).toBeUndefined();
    expect(result.stdout.trim()).toBe('');
  });

  it('should filter by name', async () => {
    const org = makeOrganization();
    state.organizations.push(org);
    state.squids.push(makeSquid(org, { name: 'alpha', slot: 'v1' }), makeSquid(org, { name: 'beta', slot: 'v1' }));

    const result = await runCommand(['ls', '--org', 'test-org', '--name', 'alpha', '--no-interactive'], server.url);

    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('alpha');
    expect(result.stdout).not.toContain('beta');
  });
});
