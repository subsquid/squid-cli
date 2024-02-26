import path from 'path';

import axios from 'axios';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import chalk from 'chalk';

import { getConfig } from '../config';

const API_DEBUG = process.env.API_DEBUG === 'true';

export function debugLog(...args: any[]) {
  if (!API_DEBUG) return;

  console.log(chalk.dim(new Date().toISOString()), chalk.cyan`[DEBUG]`, ...args);
}

let version = 'unknown';
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  version = require(path.resolve(__dirname, '../../package.json')).version;
} catch (e) {}

const config = getConfig();

export const client = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'X-CLI-Version': version,
    authorization: `token ${config.credentials}`,
  },
  validateStatus: () => true,
});

axiosRetry(client, {
  retries: 1,
  retryDelay: exponentialDelay,
});

if (API_DEBUG) {
  client.interceptors.request.use((req) => {
    console.log(
      chalk.dim(new Date().toISOString()),
      chalk.cyan`[HTTP REQUEST]`,
      req.url,
      chalk.dim(req.method?.toUpperCase()),
      chalk.dim(JSON.stringify({ headers: req.headers })),
    );

    const data = req.data;
    if (data) {
      console.log(chalk.dim(JSON.stringify(data)));
    }

    return req;
  });

  client.interceptors.response.use((res) => {
    console.log(
      chalk.dim(new Date().toISOString()),
      chalk.cyan`[HTTP RESPONSE]`,
      res.config.url,
      chalk.cyan(res.status),
      chalk.dim(JSON.stringify({ headers: res.headers })),
    );

    const data = res.data;
    if (data) {
      const contentType = res.headers['content-type']?.toString().split(';')[0];

      if (contentType === 'application/json') {
        console.log(chalk.dim(JSON.stringify(data)));
      } else if (contentType?.startsWith('text/')) {
        console.log(chalk.dim(data));
      }
    }

    return res;
  });
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: {
      error: string;
      message?: string;
      invalidFields?: { path: string[]; message: string; type: string }[];
    },
  ) {
    super(body.error);
  }
}

client.interceptors.response.use((res) => {
  switch (res.status) {
    case 200:
    case 201:
      return res;
    default:
      return Promise.reject(new ApiError(res.status, res.data));
  }
});
