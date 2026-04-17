import { getIgnorePatterns, getPostgresVersionMismatch } from './deploy';

describe('Deploy', () => {
  describe('get squid ignore paths', () => {
    const squidignore = [
      '/.git',
      '/builds',
      '#comment',
      '    /abi     ',
      'test',
      '    ',
      '.env',
      '',
      '# another comment',
      '**/foo',
    ].join('\n');

    it('root', () => {
      const patterns = getIgnorePatterns('.', squidignore);
      expect(patterns).toEqual(['/.git', '/builds', '/abi', '**/test', '**/.env', '**/foo']);
    });

    it('dir', () => {
      const patterns = getIgnorePatterns('dir', squidignore);
      expect(patterns).toEqual(['/dir/.git', '/dir/builds', '/dir/abi', '/dir/**/test', '/dir/**/.env', '/dir/**/foo']);
    });
  });

  describe('getPostgresVersionMismatch', () => {
    function makeTarget(pgVersion?: string) {
      return {
        addons: pgVersion
          ? { postgres: { connections: [], disk: { usageStatus: 'NORMAL', usedBytes: 0, totalBytes: 0 } } }
          : undefined,
        manifest: {
          current: pgVersion ? { deploy: { addons: { postgres: { version: pgVersion } } } } : { deploy: {} },
          raw: '',
        },
      } as any;
    }

    function makeManifest(pgVersion?: string) {
      return {
        deploy: pgVersion ? { addons: { postgres: { version: pgVersion } } } : { addons: {} },
      } as any;
    }

    it('returns mismatch when versions differ', () => {
      const result = getPostgresVersionMismatch(makeTarget('16'), makeManifest('17'));
      expect(result).toEqual({ currentVersion: '16', newVersion: '17' });
    });

    it('returns null when versions match', () => {
      const result = getPostgresVersionMismatch(makeTarget('16'), makeManifest('16'));
      expect(result).toBeNull();
    });

    it('returns null when target is null', () => {
      const result = getPostgresVersionMismatch(null, makeManifest('17'));
      expect(result).toBeNull();
    });

    it('returns null when target has no postgres addon', () => {
      const result = getPostgresVersionMismatch(makeTarget(), makeManifest('17'));
      expect(result).toBeNull();
    });

    it('returns null when new manifest has no postgres addon', () => {
      const result = getPostgresVersionMismatch(makeTarget('16'), makeManifest());
      expect(result).toBeNull();
    });

    it('returns null when current manifest has no postgres version', () => {
      const target = makeTarget('16');
      target.manifest.current = { deploy: { addons: { postgres: {} } } };
      const result = getPostgresVersionMismatch(target, makeManifest('17'));
      expect(result).toBeNull();
    });

    it('returns null when version is not set in new manifest', () => {
      const result = getPostgresVersionMismatch(makeTarget('14'), makeManifest());
      expect(result).toBeNull();
    });
  });
});
