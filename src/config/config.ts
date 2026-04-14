import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { resolve, dirname } from 'path';

export const DEFAULT_API_URL = process.env.SUBSQUID_DEFAULT_API_URL || 'https://cloud.sqd.dev/api';
export const DEFAULT_PROFILE_NAME = 'default';

export type ProfileConfig = {
  apiUrl: string;
  credentials: string;
};

export type Config = ProfileConfig;

type StoredConfig = {
  current: string;
  profiles: Record<string, ProfileConfig>;
};

function defaultStoredConfig(): StoredConfig {
  return {
    current: DEFAULT_PROFILE_NAME,
    profiles: {
      [DEFAULT_PROFILE_NAME]: {
        apiUrl: DEFAULT_API_URL,
        credentials: 'empty',
      },
    },
  };
}

export function getConfigFilePath() {
  return process.env.SUBSQUID_CLI_CONFIG_DIR || resolve(homedir(), '.hydra-cli', 'config.json');
}

function writeStoredConfig(config: StoredConfig) {
  const path = getConfigFilePath();
  const dir = dirname(path);

  if (!existsSync(path)) {
    if (!existsSync(dir)) {
      mkdirSync(dir);
    }
  }

  writeFileSync(path, JSON.stringify(config, null, 2), {
    flag: 'w',
    encoding: 'utf8',
  });
}

function readStoredConfig(): StoredConfig {
  try {
    const raw = JSON.parse(readFileSync(getConfigFilePath(), 'utf8'));

    // Migrate old flat format { apiUrl, credentials } to new profiles format
    if (raw.apiUrl !== undefined && raw.profiles === undefined) {
      if (raw.apiUrl === 'https://app.subsquid.io/api') {
        raw.apiUrl = DEFAULT_API_URL;
      }
      const migrated: StoredConfig = {
        current: DEFAULT_PROFILE_NAME,
        profiles: {
          [DEFAULT_PROFILE_NAME]: {
            apiUrl: raw.apiUrl || DEFAULT_API_URL,
            credentials: raw.credentials || 'empty',
          },
        },
      };
      writeStoredConfig(migrated);
      return migrated;
    }

    return raw as StoredConfig;
  } catch (e) {
    return defaultStoredConfig();
  }
}

export function getConfig(): ProfileConfig {
  const stored = readStoredConfig();
  const profileData = stored.profiles[stored.current];
  return profileData ?? { apiUrl: DEFAULT_API_URL, credentials: 'empty' };
}

export function getCurrentProfileName(): string {
  return readStoredConfig().current;
}

export function getProfiles(): Record<string, ProfileConfig> {
  return readStoredConfig().profiles;
}

export function setConfig(creds: string, host: string, profileName?: string): ProfileConfig {
  const stored = readStoredConfig();
  const name = profileName ?? stored.current;

  stored.profiles[name] = { apiUrl: host, credentials: creds };
  stored.current = name;

  writeStoredConfig(stored);

  return stored.profiles[name];
}

export function useProfile(name: string): void {
  const stored = readStoredConfig();
  if (!stored.profiles[name]) {
    throw new Error(`Profile "${name}" does not exist. Use "sqd auth -k <key> --profile ${name}" to create it.`);
  }
  stored.current = name;
  writeStoredConfig(stored);
}

export function removeProfile(name: string): void {
  const stored = readStoredConfig();
  if (!stored.profiles[name]) {
    throw new Error(`Profile "${name}" does not exist`);
  }
  if (name === stored.current) {
    throw new Error(`Cannot remove the active profile "${name}". Switch to another profile first with "sqd profile use <name>".`);
  }
  delete stored.profiles[name];
  writeStoredConfig(stored);
}

/**
 * @deprecated Use getConfig()
 */
export function getCreds(): string {
  return getConfig().credentials;
}

/**
 * @deprecated Use getConfig()
 */
export function getConfigField(name: 'apiUrl' | 'credentials'): any {
  return getConfig()[name];
}
