import path from 'path';

import axios, { Method } from 'axios';
import axiosRetry, { IAxiosRetryConfig, isNetworkOrIdempotentRequestError } from 'axios-retry';
import chalk from 'chalk';
import { isEmpty, pickBy } from 'lodash';
import ms from 'ms';
import qs from 'qs';

import { getConfig } from '../config';

const API_DEBUG = process.env.API_DEBUG === 'true';
const delayFactor = 10;
const DEFAULT_RETRY: IAxiosRetryConfig = {
  retries: 10,
  retryDelay: (retryCount, error) => axiosRetry.exponentialDelay(retryCount, error, delayFactor),
  retryCondition: isNetworkOrIdempotentRequestError,
  onRetry: (retryCount, error) => {
    if (!error.response) {
      if (retryCount === 1) {
        console.log(chalk.dim(`There appears to be trouble with your network connection. Retrying...`));
      } else if (retryCount > 6) {
        const next = ms(Math.round(axiosRetry.exponentialDelay(retryCount, error, delayFactor)));
        console.log(chalk.dim(`There appears to be trouble with your network connection. Retrying in ${next}...`));
      }
    }
  },
};

axiosRetry(axios, DEFAULT_RETRY);

let version = 'unknown';
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  version = require(path.resolve(__dirname, '../../package.json')).version;
} catch (e) {}

export class ApiError extends Error {
  constructor(
    public request: { status: number; method: string; url: string },
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
  version = 'v1',
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
  version?: 'v1';
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
  const url = !path.startsWith('https') ? `${config.apiUrl}/${version}${path}` : path;

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
      `${response.config.url}${!isEmpty(query) ? `?${qs.stringify(query)}` : ``}`,
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
