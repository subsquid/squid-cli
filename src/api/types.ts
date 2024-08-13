import { PickDeep } from 'type-fest';

import { components } from './schema';

export type HttpResponse<T> = {
  payload: T;
};

export type { DeployResponseStatus as DeployStatus } from './schema';

export type Organization = components['schemas']['OrganizationResponse'];

export type Deploy = components['schemas']['DeployResponse'];

export type UploadUrl = components['schemas']['UploadUrlResponse'];

export type SquidProcessor = components['schemas']['SquidProcessorResponse'];

export type SquidApi = components['schemas']['SquidApiResponse'];

export type SquidAddonsNeon = components['schemas']['SquidAddonsNeonResponse'];

export type SquidAddonsPostgres = components['schemas']['SquidAddonsPostgresResponse'];

export type Squid = components['schemas']['SquidResponse'];

export type SquidNameIsAvailableResponse = {
  available: boolean;
};

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

export type SquidVersionResponse = {
  id: number;
  name: string;
  version: {
    deploymentUrl: string;
  };
};

export type OrganizationRequest = { organization: PickDeep<Organization, 'code'> };

export type SquidRequest = OrganizationRequest & { squid: PickDeep<Squid, 'name' | 'slot'> };

export type DeployRequest = OrganizationRequest & { deploy: PickDeep<Deploy, 'id'> };
