import split2 from 'split2';

import { pretty } from '../logs';
import { formatSquidReference } from '../utils';

import { api, debugLog } from './api';
import {
  Deployment,
  HttpResponse,
  LogEntry,
  LogsResponse,
  OrganizationRequest,
  Squid,
  SquidRequest,
  UploadUrl,
} from './types';

export async function listSquids({ organization, name }: OrganizationRequest & { name?: string }): Promise<Squid[]> {
  const { body } = await api<HttpResponse<Squid[]>>({
    method: 'get',
    path: `/orgs/${organization.code}/squids`,
    query: { name },
  });

  return body.payload.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSquid({ organization, squid }: SquidRequest): Promise<Squid> {
  const { body } = await api<HttpResponse<Squid>>({
    method: 'get',
    path: `/orgs/${organization.code}/squids/${formatSquidReference(squid)}`,
  });

  return body.payload;
}

export async function squidHistoryLogs({
  organization,
  squid,
  query,
  abortController,
}: SquidRequest & {
  query: {
    limit: number;
    from: Date;
    nextPage?: string;
    orderBy?: string;
    container?: string[];
    level?: string[];
    search?: string;
  };
  abortController?: AbortController;
}): Promise<LogsResponse> {
  const { body } = await api<HttpResponse<LogsResponse>>({
    method: 'get',
    path: `/orgs/${organization.code}/squids/${formatSquidReference(squid)}/logs/history`,
    query: {
      ...query,
      from: query.from.toISOString(),
      level: query.level?.map((l) => l.toUpperCase()),
    },
    abortController,
  });

  const payload = body?.payload;

  return { logs: payload?.logs ?? [], nextPage: payload?.nextPage ?? null };
}

export async function squidLogsFollow({
  organization,
  squid,
  query,
  abortController,
}: SquidRequest & {
  query: { container?: string[]; level?: string[]; search?: string };
  abortController?: AbortController;
}) {
  const { body } = await api<NodeJS.ReadableStream>({
    method: 'get',
    path: `/orgs/${organization.code}/squids/${formatSquidReference(squid)}/logs/follow`,
    query,
    responseType: 'stream',
    abortController: abortController,
  });

  return body;
}

export async function streamSquidLogs({
  organization,
  squid,
  abortController,
  query = {},
  onLog,
}: SquidRequest & {
  onLog: (log: string) => unknown;
  query?: { container?: string[]; level?: string[]; search?: string };
  abortController?: AbortController;
}) {
  let attempt = 0;
  let stream: NodeJS.ReadableStream;

  while (true) {
    debugLog(`streaming logs`);
    const retry = await new Promise(async (resolve) => {
      try {
        stream = await squidLogsFollow({
          organization,
          squid,
          query,
          abortController,
        });
      } catch (e: any) {
        /**
         * 524 status means timeout
         */
        if (e.status === 524) {
          debugLog(`streaming logs timeout occurred`);
          return resolve(true);
        }

        debugLog(`streaming logs error thrown: ${e.status} ${e.message}`);

        return resolve(false);
      }

      stream
        .pipe(split2())
        .on('error', async (e: any) => {
          debugLog(`streaming logs error received: ${e.message}`);

          resolve(true);
        })
        .on('data', (line: string) => {
          if (line.length === 0) return;

          try {
            const entries: LogEntry[] = JSON.parse(line);
            pretty(entries).forEach((l) => {
              onLog(l);
            });
          } catch (e) {
            onLog(line);
          }
        })
        .on('close', async () => {
          debugLog(`streaming logs stream closed`);

          resolve(true);
        })
        .on('end', async () => {
          debugLog(`streaming logs stream ended`);

          resolve(true);
        });
    });

    if (!retry) {
      debugLog(`streaming logs exited`);
      return;
    }

    attempt++;
    debugLog(`streaming logs retrying, ${attempt} attempt...`);
  }
}

export async function deploySquid({
  organization,
  data,
}: OrganizationRequest & {
  data: {
    artifactUrl: string;
    manifestPath: string;
    options: {
      overrideSlot?: string;
      overrideName?: string;
      tag?: string;
      hardReset?: boolean;
    };
  };
}): Promise<Deployment> {
  const { body } = await api<HttpResponse<Deployment>>({
    method: 'post',
    path: `/orgs/${organization.code}/squids/deploy`,
    data,
  });

  return body.payload;
}

export async function getUploadUrl({ organization }: OrganizationRequest): Promise<UploadUrl> {
  const { body } = await api<HttpResponse<UploadUrl>>({
    method: 'post',
    path: `/orgs/${organization.code}/deployments/upload-url`,
  });

  return body.payload;
}

export async function restartSquid({ organization, squid }: SquidRequest): Promise<Deployment> {
  const { body } = await api<HttpResponse<Deployment>>({
    method: 'post',
    path: `/orgs/${organization.code}/squids/${formatSquidReference(squid)}/restart`,
  });

  return body.payload;
}

export async function deleteSquid({ organization, squid }: SquidRequest): Promise<Deployment> {
  const { body } = await api<HttpResponse<Deployment>>({
    method: 'delete',
    path: `/orgs/${organization.code}/squids/${formatSquidReference(squid)}`,
  });

  return body.payload;
}

export async function addSquidTag({ organization, squid, tag }: SquidRequest & { tag: string }): Promise<Deployment> {
  const { body } = await api<HttpResponse<Deployment>>({
    method: 'PUT',
    path: `/orgs/${organization.code}/squids/${formatSquidReference(squid)}/tags/${tag}`,
  });

  return body.payload;
}

export async function removeSquidTag({
  organization,
  squid,
  tag,
}: SquidRequest & { tag: string }): Promise<Deployment> {
  const { body } = await api<HttpResponse<Deployment>>({
    method: 'DELETE',
    path: `/orgs/${organization.code}/squids/${formatSquidReference(squid)}/tags/${tag}`,
  });

  return body.payload;
}
