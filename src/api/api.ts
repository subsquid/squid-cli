import path from 'path';

import axios, { Method } from 'axios';
import chalk from 'chalk';
import { pickBy } from 'lodash';
import ms from 'ms';

import { getConfig } from '../config';

import { ApiError, DEFAULT_RETRY, version, API_DEBUG } from './common';

export function debugLog(...args: any[]) {
  if (!API_DEBUG) return;

  console.log(chalk.dim(new Date().toISOString()), chalk.cyan`[DEBUG]`, ...args);
}

export async function api<T = any>({
  method,
  path,
  data,
  query = {},
  headers = {},
  auth,
  responseType = 'json',
  abortController,
  retry,
}: {
  method: Method;
  path: string;
  query?: Record<string, string | string[] | boolean | number | undefined>;
  data?: unknown;
  headers?: Record<string, string>;
  auth?: { apiUrl: string; credentials: string };
  responseType?: 'json' | 'stream';
  abortController?: AbortController;
  retry?: number;
}): Promise<{ body: T }> {
  const config = auth || getConfig();

  const started = Date.now();
  // add the API_URL to the path if it's not a full url
  const url = !path.startsWith('https') ? `${config.apiUrl}${path}` : path;

  const finalHeaders = {
    authorization: url.startsWith(config.apiUrl) ? `token ${config.credentials}` : null,
    'X-CLI-Version': version,
    ...headers,
  };

  const response = await axios(url, {
    method,
    headers: finalHeaders,
    data,
    timeout: responseType === 'stream' ? 0 : undefined,
    responseType,
    params: pickBy(query, (v) => v),
    signal: abortController ? (abortController.signal as any) : undefined,
    validateStatus: () => true,
    'axios-retry': retry
      ? {
          ...DEFAULT_RETRY,
          retries: retry,
        }
      : undefined,
  });

  if (API_DEBUG) {
    console.log(
      chalk.dim(new Date().toISOString()),
      chalk.cyan`[${method.toUpperCase()}]`,
      response.config.url,
      chalk.cyan(response.status),
      ms(Date.now() - started),
      chalk.dim(JSON.stringify({ headers: response.headers })),
    );
    if (response.data && responseType === 'json') {
      console.log(chalk.dim(JSON.stringify(response.data)));
    }
  }

  switch (response.status) {
    case 200:
    case 201:
    case 204:
      return { body: response.data };
    default:
      throw new ApiError(
        {
          method: method.toUpperCase(),
          url: response.config.url || 'Unknown URL',
          status: response.status,
        },
        response.data,
      );
  }
}
