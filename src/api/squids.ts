import split2 from 'split2';

import { pretty } from '../logs';

import { client, debugLog } from './client';
import {
  DeployResponse,
  HttpResponse,
  LogEntry,
  LogsResponse,
  SquidNameIsAvailableResponse,
  SquidResponse,
  SquidVersionResponse,
  UploadUrlResponse,
  VersionResponse,
} from './types';

export async function squidList({ orgCode }: { orgCode: string }): Promise<SquidResponse[]> {
  const { data } = await client.request<HttpResponse<SquidResponse[]>>({
    method: 'get',
    url: `/orgs/${orgCode}/squids`,
  });

  return data.payload;
}

export async function getSquid({
  orgCode,
  squidName,
  versionName,
}: {
  orgCode: string;
  squidName: string;
  versionName?: string;
}): Promise<SquidResponse> {
  const { data } = await client.request<HttpResponse<SquidResponse>>({
    method: 'get',
    url: `/orgs/${orgCode}/squids/${squidName}`,
    params: {
      versionName,
    },
  });

  return data.payload;
}

export async function squidNameIsAvailable(squidName: string): Promise<boolean> {
  const { data } = await client.request<HttpResponse<SquidNameIsAvailableResponse>>({
    method: 'get',
    url: `/squids/${squidName}/available`,
  });

  return Boolean(data.payload.available);
}

export async function versionHistoryLogs({
  orgCode,
  squidName,
  versionName,
  query,
  abortController,
}: {
  orgCode: string;
  squidName: string;
  versionName: string;
  query: {
    limit: number;
    from: Date;
    nextPage?: string;
    orderBy?: string;
    container?: string[];
    level?: string[];
  };
  abortController?: AbortController;
}): Promise<LogsResponse> {
  const { data } = await client.request<HttpResponse<LogsResponse>>({
    method: 'get',
    url: `/orgs/${orgCode}/squids/${squidName}/versions/${versionName}/logs/history`,
    params: {
      ...query,
      from: query.from.toISOString(),
      level: query.level?.map((l) => l.toUpperCase()),
    },
    signal: abortController?.signal,
  });

  return data.payload || { logs: [], nextPage: null };
}

export async function versionLogsFollow({
  orgCode,
  query,
  squidName,
  versionName,
  abortController,
}: {
  orgCode: string;
  squidName: string;
  versionName: string;
  query: { container?: string[]; level?: string[] };
  abortController?: AbortController;
}) {
  const { data } = await client.request<NodeJS.ReadableStream>({
    method: 'get',
    url: `/orgs/${orgCode}/squids/${squidName}/versions/${versionName}/logs/follow`,
    params: query,
    responseType: 'stream',
    signal: abortController?.signal,
  });

  return data;
}

export async function streamSquidLogs({
  orgCode,
  squidName,
  versionName,
  abortController,
  query = {},
  onLog,
}: {
  orgCode: string;
  squidName: string;
  versionName: string;
  onLog: (log: string) => unknown;
  query?: { container?: string[]; level?: string[] };
  abortController?: AbortController;
}) {
  let attempt = 0;
  let stream: NodeJS.ReadableStream;

  while (true) {
    debugLog(`streaming logs`);
    const retry = await new Promise(async (resolve) => {
      try {
        stream = await versionLogsFollow({
          orgCode,
          squidName,
          versionName,
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
  orgCode,
  data: _data,
}: {
  orgCode: string;
  data: {
    hardReset: boolean;
    artifactUrl: string;
    manifestPath: string;
  };
}): Promise<DeployResponse> {
  const { data } = await client.request<HttpResponse<DeployResponse>>({
    method: 'post',
    url: `/orgs/${orgCode}/squids/deploy`,
    headers: {
      'content-type': 'application/json',
    },
    data: _data,
  });

  return data.payload;
}

export async function getUploadUrl({ orgCode }: { orgCode: string }): Promise<UploadUrlResponse> {
  const { data } = await client.request<HttpResponse<UploadUrlResponse>>({
    method: 'post',
    url: `/orgs/${orgCode}/deploys/upload-url`,
  });

  return data.payload;
}

export async function restartSquid({
  orgCode,
  squidName,
  versionName,
}: {
  orgCode: string;
  squidName: string;
  versionName: string;
}): Promise<DeployResponse> {
  const { data } = await client.request<HttpResponse<DeployResponse>>({
    method: 'put',
    url: `/orgs/${orgCode}/squids/${squidName}/version/${versionName}/redeploy`,
  });

  return data.payload;
}

export async function destroyVersion({
  orgCode,
  squidName,
  versionName,
}: {
  orgCode: string;
  squidName: string;
  versionName: string;
}): Promise<string> {
  const { data } = await client.request<HttpResponse<SquidResponse>>({
    method: 'delete',
    url: `/orgs/${orgCode}/squids/${squidName}/version/${versionName}`,
  });

  return `Destroyed Squid "${data.payload.name}" version ${data.payload.versions?.[0]?.name}`;
}

export async function destroySquid({ orgCode, squidName }: { orgCode: string; squidName: string }): Promise<string> {
  const { data } = await client.request<HttpResponse<SquidResponse>>({
    method: 'delete',
    url: `/orgs/${orgCode}/squids/${squidName}`,
  });

  return `Destroyed Squid ${data.payload.name}`;
}
