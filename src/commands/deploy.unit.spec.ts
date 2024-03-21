import { getIgnorePatterns } from './deploy';

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
});
