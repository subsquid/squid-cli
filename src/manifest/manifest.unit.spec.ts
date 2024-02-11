import { formatManifest } from './manifest';

describe('Manifest', () => {
  describe('formatManifest', () => {
    it('should replace null as empty string', () => {
      const formatted = formatManifest({
        name: 'test',
        version: 1,
        build: null as any,
      });

      expect(formatted).toEqual(['name: test', 'version: 1', 'build: ', ''].join('\n'));
    });
  });
});
