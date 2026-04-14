import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { makeOrganization, makeSquid, runCommand } from './helpers';
import { createDefaultState, MockServer, MockState, startMockServer } from './mock-server';

describe('view', () => {
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

  it('should display squid details', async () => {
    const org = makeOrganization();
    state.organizations.push(org);
    state.squids.push(
      makeSquid(org, {
        name: 'my-squid',
        slot: 'v1',
        status: 'DEPLOYED',
        tags: [{ name: 'prod' }],
      }),
    );

    const result = await runCommand(['view', '--reference', 'test-org/my-squid@v1', '--no-interactive'], server.url);

    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('my-squid');
    expect(result.stdout).toContain('DEPLOYED');
  });

  it('should output JSON when --json is passed', async () => {
    const org = makeOrganization();
    state.organizations.push(org);
    state.squids.push(makeSquid(org, { name: 'my-squid', slot: 'v1', status: 'DEPLOYED' }));

    const result = await runCommand(
      ['view', '--reference', 'test-org/my-squid@v1', '--no-interactive', '--json'],
      server.url,
    );

    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(result.stdout);
    expect(parsed.name).toBe('my-squid');
    expect(parsed.slot).toBe('v1');
    expect(parsed.status).toBe('DEPLOYED');
  });

  it('should fail for a non-existent squid', async () => {
    const org = makeOrganization();
    state.organizations.push(org);

    const result = await runCommand(['view', '--reference', 'test-org/missing@v1', '--no-interactive'], server.url);

    expect(result.error).toBeDefined();
  });
});
