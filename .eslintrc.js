module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint/eslint-plugin', 'prettier'],
    extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:import/typescript'
    ],
    root: true,
    env: {
        node: true,
        jest: true,
    },
    rules: {
        'max-len': ['error', { code: 120, ignoreComments: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
        'prettier/prettier': ['error', { printWidth: 120 }],
        'no-implicit-coercion': ['error', { allow: ['!!'] }],
        'import/order': [
            'error',
            {

                pathGroups: [
                ],
                'newlines-between': 'always',
                alphabetize: {
                    order: 'asc' /* sort in ascending order. Options: ['ignore', 'asc', 'desc'] */,
                    caseInsensitive: true /* ignore case. Options: [true, false] */,
                },
                pathGroupsExcludedImportTypes: ['builtin'],
                groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object'],
            },
        ],
        'import/no-unresolved': 'off',
        'no-negated-condition': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/ban-ts-ignore': 'off',
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/camelcase': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-unsafe-declaration-merging': 'off'
    },
};

