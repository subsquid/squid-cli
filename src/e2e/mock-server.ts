import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';

export interface MockSquid {
  id: number;
  name: string;
  reference: string;
  slot: string;
  description?: string | null;
  tags: { name: string }[];
  manifest: { current: Record<string, unknown>; raw: string };
  packageJson: Record<string, unknown>;
  api?: {
    status: string;
    urls: { type: string; name?: string; url: string }[];
  };
  processors?: {
    name: string;
    status: string;
    syncState: { totalBlocks: number; currentBlock: number };
  }[];
  addons?: Record<string, unknown>;
  spec: number;
  lastDeploy?: { id: number; type: string };
  status?: string;
  organization: { id: string; name: string; code: string };
  hibernatedAt?: string;
  deployedAt?: string;
  links: { cloudUrl: string; dockerImageUrl: string };
  createdAt: string;
}

export interface MockOrganization {
  id: string;
  code: string;
  name: string;
  email: { address: string; verified: boolean };
  roleType: string;
  status: string;
  limits: Record<string, unknown>;
  billingDetails: Record<string, unknown>;
  integrations: Record<string, unknown>;
}

export interface MockDeployment {
  id: number;
  type: string;
  status: string;
  failed: string;
  logs: { severity: string; message: string }[];
  organization: { id: string; name: string; code: string };
  user: { id: string; email: string; fullName: string } | null;
  squid: { id: number; name: string; slot: string; reference: string } | null;
  options: { tag?: string; hardReset?: boolean };
  totalElapsedTimeMs: number;
  updatedAt: string;
  createdAt: string;
}

export interface MockState {
  user: { username: string; email: string } | null;
  organizations: MockOrganization[];
  squids: MockSquid[];
  secrets: Record<string, Record<string, string>>;
  deployments: MockDeployment[];
  validTokens: string[];
  /** Per-deployment status sequences for polling simulation */
  deploymentStatusSequences: Map<number, string[]>;
}

export function createDefaultState(): MockState {
  return {
    user: { username: 'testuser', email: 'test@example.com' },
    organizations: [],
    squids: [],
    secrets: {},
    deployments: [],
    validTokens: ['test-token'],
    deploymentStatusSequences: new Map(),
  };
}

function payload<T>(data: T) {
  return { payload: data };
}

export function createMockApp(state: MockState) {
  const app = new Hono().basePath('/api');

  app.use('*', async (c, next) => {
    const auth = c.req.header('authorization');
    const token = auth?.replace('token ', '');

    if (!token || !state.validTokens.includes(token)) {
      return c.json({ error: 'Credentials are missing or invalid' }, 401);
    }
    await next();
  });

  // --- Profile ---

  app.get('/v1/user', (c) => {
    if (!state.user) {
      return c.json({ payload: null }, 200);
    }
    return c.json(payload(state.user));
  });

  app.get('/v1/user/squids', (c) => {
    const name = c.req.query('name');
    let squids = state.squids;
    if (name) {
      squids = squids.filter((s) => s.name === name);
    }
    return c.json(payload(squids));
  });

  // --- Organizations ---

  app.get('/v1/orgs', (c) => {
    return c.json(payload(state.organizations));
  });

  app.get('/v1/orgs/:code', (c) => {
    const org = state.organizations.find((o) => o.code === c.req.param('code'));
    if (!org) {
      return c.json({ error: `Organization not found` }, 404);
    }
    return c.json(payload(org));
  });

  // --- Squids ---

  app.get('/v1/orgs/:code/squids', (c) => {
    const code = c.req.param('code');
    const name = c.req.query('name');
    let squids = state.squids.filter((s) => s.organization.code === code);
    if (name) {
      squids = squids.filter((s) => s.name === name);
    }
    return c.json(payload(squids));
  });

  app.get('/v1/orgs/:code/squids/:ref', (c) => {
    const code = c.req.param('code');
    const ref = c.req.param('ref');
    const squid = state.squids.find(
      (s) => s.organization.code === code && (s.reference === ref || `${s.name}@${s.slot}` === ref),
    );
    if (!squid) {
      return c.json({ error: `Squid "${ref}" not found` }, 404);
    }
    return c.json(payload(squid));
  });

  app.post('/v1/orgs/:code/squids/deploy', async (c) => {
    const code = c.req.param('code');
    const org = state.organizations.find((o) => o.code === code);
    if (!org) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    const body = await c.req.json();
    const deployment = createDeployment(org, 'DEPLOY', body.options);
    state.deployments.push(deployment);
    state.deploymentStatusSequences.set(deployment.id, ['UNPACKING', 'IMAGE_BUILDING', 'DEPLOYING', 'OK']);

    return c.json(payload(deployment), 201);
  });

  app.delete('/v1/orgs/:code/squids/:ref', (c) => {
    const code = c.req.param('code');
    const ref = c.req.param('ref');
    const org = state.organizations.find((o) => o.code === code);
    if (!org) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    const squidIdx = state.squids.findIndex(
      (s) => s.organization.code === code && (s.reference === ref || `${s.name}@${s.slot}` === ref),
    );
    if (squidIdx === -1) {
      return c.json({ error: `Squid "${ref}" not found` }, 404);
    }

    const squid = state.squids[squidIdx];
    const deployment = createDeployment(org, 'DELETE', {}, squid);
    state.deployments.push(deployment);
    state.deploymentStatusSequences.set(deployment.id, ['SQUID_DELETING', 'OK']);

    state.squids.splice(squidIdx, 1);

    return c.json(payload(deployment));
  });

  app.post('/v1/orgs/:code/squids/:ref/restart', (c) => {
    const code = c.req.param('code');
    const ref = c.req.param('ref');
    const org = state.organizations.find((o) => o.code === code);
    if (!org) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    const squid = state.squids.find(
      (s) => s.organization.code === code && (s.reference === ref || `${s.name}@${s.slot}` === ref),
    );
    if (!squid) {
      return c.json({ error: `Squid "${ref}" not found` }, 404);
    }

    const deployment = createDeployment(org, 'RESTART', {}, squid);
    state.deployments.push(deployment);
    state.deploymentStatusSequences.set(deployment.id, ['DEPLOYING', 'OK']);

    return c.json(payload(deployment));
  });

  // --- Tags ---

  app.put('/v1/orgs/:code/squids/:ref/tags/:tag', (c) => {
    const code = c.req.param('code');
    const ref = c.req.param('ref');
    const tag = c.req.param('tag');
    const org = state.organizations.find((o) => o.code === code);
    if (!org) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    const squid = state.squids.find(
      (s) => s.organization.code === code && (s.reference === ref || `${s.name}@${s.slot}` === ref),
    );
    if (!squid) {
      return c.json({ error: `Squid "${ref}" not found` }, 404);
    }

    if (!squid.tags.some((t) => t.name === tag)) {
      squid.tags.push({ name: tag });
    }

    const deployment = createDeployment(org, 'SET_TAG', { tag }, squid);
    state.deployments.push(deployment);
    state.deploymentStatusSequences.set(deployment.id, ['OK']);

    return c.json(payload(deployment));
  });

  app.delete('/v1/orgs/:code/squids/:ref/tags/:tag', (c) => {
    const code = c.req.param('code');
    const ref = c.req.param('ref');
    const tag = c.req.param('tag');
    const org = state.organizations.find((o) => o.code === code);
    if (!org) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    const squid = state.squids.find(
      (s) => s.organization.code === code && (s.reference === ref || `${s.name}@${s.slot}` === ref),
    );
    if (!squid) {
      return c.json({ error: `Squid "${ref}" not found` }, 404);
    }

    squid.tags = squid.tags.filter((t) => t.name !== tag);

    const deployment = createDeployment(org, 'REMOVE_TAG', { tag }, squid);
    state.deployments.push(deployment);
    state.deploymentStatusSequences.set(deployment.id, ['OK']);

    return c.json(payload(deployment));
  });

  // --- Deployments ---

  app.get('/v1/orgs/:code/deployments/:id', (c) => {
    const id = Number(c.req.param('id'));
    const deployment = state.deployments.find((d) => d.id === id);
    if (!deployment) {
      return c.json({ error: 'Deployment not found' }, 404);
    }

    const sequence = state.deploymentStatusSequences.get(id);
    if (sequence && sequence.length > 0) {
      deployment.status = sequence.shift()!;
    }

    return c.json(payload(deployment));
  });

  app.get('/v1/orgs/:code/deployments', (c) => {
    const code = c.req.param('code');
    const deployments = state.deployments.filter((d) => d.organization.code === code);
    return c.json(payload(deployments));
  });

  // --- Secrets ---

  app.get('/v1/orgs/:code/secrets', (c) => {
    const code = c.req.param('code');
    const secrets = state.secrets[code] || {};
    return c.json(payload({ secrets }));
  });

  app.put('/v1/orgs/:code/secrets', async (c) => {
    const code = c.req.param('code');
    const body = await c.req.json();

    if (!state.secrets[code]) {
      state.secrets[code] = {};
    }

    for (const secret of body.secrets || []) {
      if (secret.action === 'UPDATE') {
        state.secrets[code][secret.name] = secret.value;
      } else if (secret.action === 'DELETE') {
        delete state.secrets[code][secret.name];
      }
    }

    return c.json(payload({ secrets: state.secrets[code] }));
  });

  // --- Upload URL (for deploy) ---

  app.post('/v1/orgs/:code/deployments/upload-url', (c) => {
    return c.json(
      payload({
        uploadUrl: 'https://upload.example.com/upload',
        uploadFields: { key: 'test-key' },
        fileUrl: 'https://upload.example.com/artifact.tar.gz',
        maxUploadBytes: 100_000_000,
      }),
    );
  });

  return app;
}

let nextDeploymentId = 1;

function createDeployment(
  org: MockOrganization,
  type: string,
  options: Record<string, unknown> = {},
  squid?: MockSquid,
): MockDeployment {
  const id = nextDeploymentId++;
  return {
    id,
    type,
    status: 'UNPACKING',
    failed: 'NO',
    logs: [],
    organization: { id: org.id, name: org.name, code: org.code },
    user: { id: 'user-1', email: 'test@example.com', fullName: 'Test User' },
    squid: squid ? { id: squid.id, name: squid.name, slot: squid.slot, reference: squid.reference } : null,
    options: options as MockDeployment['options'],
    totalElapsedTimeMs: 5000,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

export function resetDeploymentIdCounter() {
  nextDeploymentId = 1;
}

export interface MockServer {
  url: string;
  server: Server;
  state: MockState;
  close: () => Promise<void>;
}

export async function startMockServer(state?: MockState): Promise<MockServer> {
  const mockState = state || createDefaultState();
  const app = createMockApp(mockState);

  return new Promise((resolve) => {
    const server = serve({ fetch: app.fetch, port: 0 }, (info) => {
      const url = `http://localhost:${info.port}/api`;
      resolve({
        url,
        server: server as unknown as Server,
        state: mockState,
        close: () =>
          new Promise<void>((res) => {
            (server as unknown as Server).close(() => res());
          }),
      });
    });
  });
}
