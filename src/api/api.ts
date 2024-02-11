import path from 'path';

import chalk from 'chalk';
import { pickBy } from 'lodash';
import fetch from 'node-fetch';
import qs from 'qs';

import { getConfig } from '../config';

const API_DEBUG = process.env.API_DEBUG === 'true';

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

export function debugLog(...args: any[]) {
  if (!API_DEBUG) return;

  console.log(chalk.dim(new Date().toISOString()), chalk.cyan`[DEBUG]`, ...args);
}

export async function api<T = any>({
  method,
  path,
  data,
  query = {},
  auth,
  responseType = 'json',
  abortController,
}: {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  query?: Record<string, string | string[] | boolean | number | undefined>;
  data?: unknown;
  auth?: { apiUrl: string; credentials: string };
  responseType?: 'json' | 'stream';
  abortController?: AbortController;
}): Promise<{ body: T }> {
  const config = auth || getConfig();

  const sanitizedQuery = pickBy(query, (v) => v);
  const queryString = Object.keys(sanitizedQuery).length ? `?${qs.stringify(sanitizedQuery)}` : '';

  const url = !path.startsWith('https') ? `${config.apiUrl}${path}${queryString}` : `${path}${queryString}`;

  const headers = {
    'Content-Type': 'application/json',
    authorization: `token ${config.credentials}`,
    'X-CLI-Version': version,
  };

  if (API_DEBUG) {
    console.log(
      chalk.dim(new Date().toISOString()),
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
    timeout: responseType === 'stream' ? 0 : undefined,
    signal: abortController ? (abortController.signal as any) : undefined,
  });

  let body;
  if (responseType === 'json') {
    const rawBody = await response.text();
    try {
      body = responseType === 'json' ? JSON.parse(rawBody) : response.body;
    } catch (e) {
      body = rawBody;
    }
  } else {
    body = response.body;
  }

  if (API_DEBUG) {
    console.log(
      chalk.dim(new Date().toISOString()),
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
