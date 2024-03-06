export type HttpResponse<T> = {
  payload: T;
};

export enum DeployStatus {
  CREATED = 'CREATED',
  RESETTING = 'RESETTING',
  UNPACKING = 'UNPACKING',
  IMAGE_BUILDING = 'IMAGE_BUILDING',
  IMAGE_PUSHING = 'IMAGE_PUSHING',
  DEPLOYING = 'DEPLOYING',
  OK = 'OK',
}

export type DeployResponse = {
  id: string;
  status: DeployStatus;
  squidName?: string;
  versionName?: string;
  orgCode?: string;
  deploymentUrl?: string;
  failed: 'NO' | 'UNEXPECTED' | 'PERMISSIONS' | 'REQUIREMENTS' | 'SOURCE_FILES_BUILD_FAILED';
  logs: { severity: 'debug' | 'warn' | 'info' | 'error'; message: string }[];
  createdAt: string;
};

export type UploadUrlResponse = {
  uploadUrl: string;
  uploadFields: Record<string, string>;
  maxUploadBytes: number;
  fileUrl: string;
};

export type DeploymentStatus = 'CREATED' | 'DEPLOYING' | 'DEPLOY_ERROR' | 'DEPLOYED';
export type SecretsStatus = 'UP_TO_DATE' | 'NONE' | 'OUTDATED';

export type SquidProcessor = {
  name: string;
  status: 'SYNCING' | 'UNKNOWN' | 'STARTING' | 'SYNCED';
  syncState: {
    currentBlock: number;
    totalBlocks: number;
  };
};

export type VersionResponse = {
  id: number;
  name: string;
  artifactUrl: string;
  deploymentUrl: string;
  description: string;
  status: DeploymentStatus;
  secretStatus: SecretsStatus;
  deploy: {
    status: 'HIBERNATED' | 'DEPLOYED' | 'DEPLOYING';
  };
  api: {
    status: 'NOT_AVAILABLE' | 'AVAILABLE';
  };
  processors: SquidProcessor[];
  db: {
    disk: {
      totalBytes: number;
      usedBytes: number;
      usageStatus: 'LOW' | 'NORMAL' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
    };
    ingress: {
      url: number;
      db: string;
      user: string;
      password: string;
    };
  };
  runningDeploy?: {
    id: string;
    type: 'DELETE' | 'DEPLOY' | 'RESTART' | 'HIBERNATE';
  };

  aliases: { name: string }[];
  deployedAt: Date;
  createdAt: Date;
};

export type SquidResponse = {
  id: number;
  name: string;
  description: string;
  logoUrl: string;
  sourceCodeUrl: string;
  websiteUrl: string;
  versions: VersionResponse[];
  aliasProd: string;
  isPublic: boolean;
  deploy?: DeployResponse;
  createdAt: Date;
  organization?: SquidOrganizationResponse;
};

export type SquidOrganizationResponse = {
  id: string;
  code: string;
  name: string;
};

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
