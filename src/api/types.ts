import { PickDeep } from 'type-fest';

import { components } from './schema';

export type HttpResponse<T> = {
  payload: T;
};

export type Organization = components['schemas']['OrganizationResponse'];

export type Deployment = components['schemas']['DeploymentResponse'];

export type UploadUrl = components['schemas']['UploadUrlResponse'];

export type SquidProcessor = components['schemas']['SquidProcessorResponse'];

export type SquidApi = components['schemas']['SquidApiResponse'];

export type SquidAddonsNeon = components['schemas']['SquidAddonsNeonResponse'];

export type SquidAddonsPostgres = components['schemas']['SquidAddonsPostgresResponse'];

export type Squid = components['schemas']['SquidResponse'];

export type SecretsListResponse = {
  secrets: Record<string, string>;
};

export enum LogLevel {
  Error = 'ERROR',
  Debug = 'DEBUG',
  Info = 'INFO',
  Notice = 'NOTICE',
  Warning = 'WARNING',
  Critical = 'CRITICAL',
  Fatal = 'FATAL',
}
export type LogPayload = string | Record<string, unknown>;

export type LogEntry = {
  timestamp: string;
  container: string;
  level: LogLevel;
  payload: LogPayload;
};

export type LogsResponse = {
  logs: LogEntry[];
  nextPage: string | null;
};

export type OrganizationRequest = { organization: PickDeep<Organization, 'code'> };

export type SquidRequest = OrganizationRequest & {
  squid:
    | ({ name: string } & (
        | { tag?: never; slot: string }
        | { tag: string; slot?: never }
        | { tag: string; slot: string }
      ))
    | string;
};

export type DeployRequest = OrganizationRequest & { deploy: PickDeep<Deployment, 'id'> };
