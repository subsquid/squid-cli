import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { makeOrganization, makeSquid, runCommand } from './helpers';
import { createDefaultState, MockServer, MockState, resetDeploymentIdCounter, startMockServer } from './mock-server';

describe('remove', () => {
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
    state.deployments = [];
    state.deploymentStatusSequences.clear();
    resetDeploymentIdCounter();
  });

  it('should remove a squid with --force', async () => {
    const org = makeOrganization();
    state.organizations.push(org);
    state.squids.push(makeSquid(org, { name: 'my-squid', slot: 'v1' }));

    expect(state.squids).toHaveLength(1);

    const result = await runCommand(
      ['rm', '--reference', 'test-org/my-squid@v1', '-f', '--no-interactive'],
      server.url,
    );

    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('successfully deleted');
    expect(state.squids).toHaveLength(0);
  });

  it('should fail for a non-existent squid', async () => {
    const org = makeOrganization();
    state.organizations.push(org);

    const result = await runCommand(['rm', '--reference', 'test-org/missing@v1', '-f', '--no-interactive'], server.url);

    expect(result.error).toBeDefined();
  });
});
