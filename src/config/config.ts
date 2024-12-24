import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { resolve, dirname } from 'path';

export const DEFAULT_API_URL = process.env.SUBSQUID_DEFAULT_API_URL || 'https://cloud.sqd.dev/api';

export type Config = {
  apiUrl: string;
  credentials: string;
};

function defaultConfig(apiUrl: string = DEFAULT_API_URL) {
  return {
    apiUrl,
    credentials: 'empty',
  };
}

export function getConfigFilePath() {
  return process.env.SUBSQUID_CLI_CONFIG_DIR || resolve(homedir(), '.hydra-cli', 'config.json');
}

function writeConfig(config: Config) {
  const path = getConfigFilePath();
  const dir = dirname(path);

  if (!existsSync(path)) {
    if (!existsSync(dir)) {
      mkdirSync(dir);
    }
  }

  writeFileSync(path, JSON.stringify(config), {
    flag: 'w',
    encoding: 'utf8',
  });
}

export function getConfig(): Config {
  try {
    const config = JSON.parse(readFileSync(getConfigFilePath(), 'utf8'));

    // Migrate old config API URL
    if (config.apiUrl === 'https://app.subsquid.io/api') {
      config.apiUrl = DEFAULT_API_URL;
      writeConfig(config);
    }

    return config;
  } catch (e) {
    return defaultConfig();
  }
}

export function setConfig(creds: string, host: string) {
  const config = {
    ...getConfig(),
    apiUrl: host,
    credentials: creds,
  };

  writeConfig(config);

  return config;
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
