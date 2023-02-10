import path from 'path';

import chalk from 'chalk';
import fetch from 'node-fetch';
import qs from 'query-string';

import { getConfig } from '../config';

const debug = process.env.API_DEBUG === 'true';

let version = 'unknown';
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  version = require(path.resolve(__dirname, '../../package.json')).version;
} catch (e) {}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: {
      error: string;
      message?: string;
      invalidFields?: { path: string[]; message: string; type: string }[];
    },
  ) {
    super();

    if (body?.message) {
      this.message = body.message;
    }
  }
}

export async function api<T = any>({
  method,
  path,
  data,
  query,
  auth,
  responseType = 'json',
}: {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  query?: Record<string, string | string[] | boolean | number | undefined>;
  data?: unknown;
  auth?: { apiUrl: string; credentials: string };
  responseType?: 'json' | 'stream';
}): Promise<{ body: T }> {
  const config = auth || getConfig();

  const url = `${config.apiUrl}${path}${query ? `?${qs.stringify(query)}` : ''}`;

  const headers = {
    'Content-Type': 'application/json',
    authorization: `token ${config.credentials}`,
    'X-CLI-Version': version,
  };

  if (debug) {
    console.log(
      chalk.cyan`[HTTP REQUEST]`,
      chalk.dim(method?.toUpperCase()),
      url,
      chalk.dim(JSON.stringify({ headers })),
    );
    if (data) {
      console.log(chalk.dim(JSON.stringify(data)));
    }
  }
  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  let body;
  try {
    body = responseType === 'json' ? await response.json() : response.body;
  } catch (e) {}

  if (debug) {
    console.log(
      chalk.cyan`[HTTP RESPONSE]`,
      url,
      chalk.cyan(response.status),
      chalk.dim(JSON.stringify({ headers: response.headers })),
    );
    if (body && responseType === 'json') {
      console.log(chalk.dim(JSON.stringify(body, null, 2)));
    }
  }

  switch (response.status) {
    case 200:
    case 201:
      return { body };
    default:
      throw new ApiError(response.status, body as any);
  }
}
