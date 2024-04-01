import path from 'path';

import axios from 'axios';
import axiosRetry, { IAxiosRetryConfig, isNetworkOrIdempotentRequestError } from 'axios-retry';

export const API_DEBUG = process.env.API_DEBUG === 'true';

export const DEFAULT_RETRY: IAxiosRetryConfig = {
  retries: 10,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: isNetworkOrIdempotentRequestError,
};

axiosRetry(axios, DEFAULT_RETRY);

export let version = 'unknown';
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
