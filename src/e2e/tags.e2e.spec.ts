import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { makeOrganization, makeSquid, runCommand } from './helpers';
import { createDefaultState, MockServer, MockState, resetDeploymentIdCounter, startMockServer } from './mock-server';

describe('tags', () => {
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

  describe('add', () => {
    it('should add a tag to a squid', async () => {
      const org = makeOrganization();
      state.organizations.push(org);
      state.squids.push(makeSquid(org, { name: 'my-squid', slot: 'v1', tags: [] }));

      const result = await runCommand(
        ['tags:add', 'prod', '--reference', 'test-org/my-squid@v1', '--no-interactive'],
        server.url,
      );

      expect(result.error).toBeUndefined();
      expect(result.stdout).toContain('successfully updated');
      expect(state.squids[0].tags).toContainEqual({ name: 'prod' });
    });

    it('should skip if tag already assigned', async () => {
      const org = makeOrganization();
      state.organizations.push(org);
      state.squids.push(makeSquid(org, { name: 'my-squid', slot: 'v1', tags: [{ name: 'prod' }] }));

      const result = await runCommand(
        ['tags:add', 'prod', '--reference', 'test-org/my-squid@v1', '--no-interactive'],
        server.url,
      );

      expect(result.error).toBeUndefined();
      expect(result.stdout).toContain('already assigned');
    });
  });

  describe('remove', () => {
    it('should remove a tag from a squid', async () => {
      const org = makeOrganization();
      state.organizations.push(org);
      state.squids.push(makeSquid(org, { name: 'my-squid', slot: 'v1', tags: [{ name: 'prod' }] }));

      const result = await runCommand(
        ['tags:remove', 'prod', '--reference', 'test-org/my-squid@v1', '--no-interactive'],
        server.url,
      );

      expect(result.error).toBeUndefined();
      expect(result.stdout).toContain('successfully updated');
      expect(state.squids[0].tags).not.toContainEqual({ name: 'prod' });
    });

    it('should handle removing a tag that does not exist', async () => {
      const org = makeOrganization();
      state.organizations.push(org);
      state.squids.push(makeSquid(org, { name: 'my-squid', slot: 'v1', tags: [] }));

      const result = await runCommand(
        ['tags:remove', 'missing', '--reference', 'test-org/my-squid@v1', '--no-interactive'],
        server.url,
      );

      expect(result.error).toBeUndefined();
      expect(result.stdout).toContain('not assigned');
    });
  });
});
