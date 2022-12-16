import { createInterface } from 'readline';

import { pretty } from '../logs';

import { api } from './api';
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

export async function squidCreate(
  name: string,
  description?: string,
  logoUrl?: string,
  websiteUrl?: string,
): Promise<SquidResponse> {
  const { body } = await api<SquidResponse>({
    method: 'post',
    path: '/client/squid',
    data: {
      name: name,
      description: description,
      logoUrl: logoUrl,
      websiteUrl: websiteUrl,
    },
  });

  return body;
}

export async function squidList(): Promise<SquidResponse[]> {
  const { body } = await api<HttpResponse<SquidResponse[]>>({
    method: 'get',
    path: '/squids',
  });

  return body.payload;
}

export async function getSquid(squidName: string, versionName?: string): Promise<SquidResponse> {
  const { body } = await api<SquidResponse>({
    method: 'get',
    path: `/client/squid/${squidName}`,
    query: {
      versionName,
    },
  });

  return body;
}

export async function squidNameIsAvailable(squidName: string): Promise<boolean> {
  const { body } = await api<HttpResponse<SquidNameIsAvailableResponse>>({
    method: 'get',
    path: `/squids/${squidName}/available`,
  });

  return Boolean(body.payload?.available);
}

export async function versionHistoryLogs(
  squidName: string,
  versionName: string,
  query: {
    limit: number;
    from: Date;
    nextPage?: string;
    orderBy?: string;
    container?: string[];
    level?: string[];
  },
): Promise<LogsResponse> {
  const { body } = await api<LogsResponse>({
    method: 'get',
    path: `/client/squid/${squidName}/versions/${versionName}/logs/history`,
    query: {
      ...query,
      from: query.from.toISOString(),
      level: query.level?.map((l) => l.toUpperCase()),
    },
  });

  return body || { logs: [], nextPage: null };
}

export async function versionLogsFollow(
  squidName: string,
  versionName: string,
  query: { container?: string[]; level?: string[] },
) {
  const { body } = await api<NodeJS.ReadableStream>({
    method: 'get',
    path: `/client/squid/${squidName}/versions/${versionName}/logs/follow`,
    query,
    responseType: 'stream',
  });

  return body;
}

export function streamLines(body: NodeJS.ReadableStream, cb: (line: string) => void) {
  const rl = createInterface({
    input: body,
    crlfDelay: Infinity,
  });

  rl.on('line', cb);

  return rl;
}

export async function streamSquidLogs(
  squidName: string,
  versionName: string,
  onLog: (log: string) => unknown,
  query: { container?: string[]; level?: string[] } = {},
) {
  while (true) {
    const retry = await new Promise(async (resolve) => {
      const stream = await versionLogsFollow(squidName, versionName, query).catch((e) => {
        /**
         * 524 status means timeout
         */
        if (e.status === 524) {
          resolve(true);
          return;
        }

        resolve(false);
      });

      if (!stream) return;

      streamLines(stream, (line) => {
        if (line.length === 0) return;

        try {
          const entries: LogEntry[] = JSON.parse(line);

          pretty(entries).forEach((l) => {
            onLog(l);
          });
        } catch (e) {
          resolve(false);
        }
      });

      stream.on('error', async (e) => {
        resolve(false);
      });
    });

    if (!retry) return;
  }
}

export async function releaseSquid(
  squidName: string,
  versionName: string,
  artifactUrl: string,
  description?: string,
  envs?: Record<string, string>,
): Promise<SquidVersionResponse> {
  const { body } = await api<SquidVersionResponse>({
    method: 'post',
    path: `/client/squid/${squidName}/version`,
    data: { artifactUrl, versionName, description, envs },
  });

  return body;
}

export async function deploySquid(data: {
  hardReset: boolean;
  artifactUrl: string;
  manifestPath: string;
}): Promise<DeployResponse> {
  const { body } = await api<HttpResponse<DeployResponse>>({
    method: 'post',
    path: `/squids/deploy`,
    data,
  });

  return body.payload;
}

export async function isVersionExists(squid: string, version: string) {
  const squids = await squidList();

  return squids.find((s) => s.name === squid)?.versions?.find((v) => v.name === version);
}

export async function getUploadUrl(): Promise<UploadUrlResponse> {
  const { body } = await api<HttpResponse<UploadUrlResponse>>({
    method: 'post',
    path: `/deploys/upload-url`,
  });

  return body.payload;
}

export async function updateSquid(
  squidName: string,
  versionName: string,
  artifactUrl: string,
  hardReset: boolean,
  envs?: Record<string, string>,
): Promise<VersionResponse> {
  const { body } = await api<VersionResponse>({
    method: 'put',
    path: `/client/squid/${squidName}/version/${versionName}/deployment`,
    data: { artifactUrl, hardReset, envs },
  });
  return body;
}

export async function redeploySquid(
  squidName: string,
  versionName: string,
  envs?: Record<string, string>,
): Promise<SquidResponse> {
  const { body } = await api<HttpResponse<SquidResponse>>({
    method: 'put',
    path: `/client/squid/${squidName}/version/${versionName}/redeploy`,
    data: { envs },
  });
  return body.payload;
}

export async function destroyVersion(squidName: string, versionName: string): Promise<string> {
  const { body } = await api<HttpResponse<SquidResponse>>({
    method: 'delete',
    path: `/squids/${squidName}/version/${versionName}`,
  });

  return `Destroyed Squid "${body.payload.name}" version ${body.payload.versions?.[0]?.name}`;
}

export async function destroySquid(squidName: string): Promise<string> {
  const { body } = await api<HttpResponse<SquidResponse>>({
    method: 'delete',
    path: `/squids/${squidName}`,
  });

  return `Destroyed Squid ${body.payload.name}`;
}
