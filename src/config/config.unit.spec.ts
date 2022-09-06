import { unlinkSync } from 'fs';
import { homedir } from 'os';

import { DEFAULT_API_URL, getConfig, getConfigFilePath, setConfig } from './config';

describe('Config', () => {
  describe('getConfigOption', () => {
    afterAll(() => {
      process.env.SUBSQUID_CLI_CONFIG_DIR = undefined;
    });
    it('should return default config path', () => {
      expect(getConfigFilePath()).toEqual(`${homedir()}/.hydra-cli/config.json`);
    });

    it('should return override config path via env', () => {
      process.env.SUBSQUID_CLI_CONFIG_DIR = `${__dirname}/config.json`;
      expect(getConfigFilePath()).toEqual(process.env.SUBSQUID_CLI_CONFIG_DIR);
    });
  });

  describe('getConfig', () => {
    afterAll(() => {
      if (!process.env.SUBSQUID_CLI_CONFIG_DIR) return;

      unlinkSync(process.env.SUBSQUID_CLI_CONFIG_DIR);
      process.env.SUBSQUID_CLI_CONFIG_DIR = undefined;
    });

    it('should return default config if config did not exists', () => {
      process.env.SUBSQUID_CLI_CONFIG_DIR = `${__dirname}/test-stubs/config1.json`;
      expect(getConfig()).toMatchObject({ apiUrl: DEFAULT_API_URL, credentials: 'empty' });
    });

    it('should set and get same config', () => {
      process.env.SUBSQUID_CLI_CONFIG_DIR = `${__dirname}/test-stubs/config2.json`;
      expect(setConfig('testToken', 'test.ru')).toMatchObject({ apiUrl: 'test.ru', credentials: 'testToken' });
      expect(getConfig()).toMatchObject({ apiUrl: 'test.ru', credentials: 'testToken' });
    });
  });
});
