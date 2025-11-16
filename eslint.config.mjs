import nx from '@nx/eslint-plugin';

const disableNxBoundaries = process.env.LINT_CI_RUNNER === '1' || process.env.CI === 'true';
const disableTypeAware = process.env.LINT_CI_RUNNER === '1' || process.env.CI === 'true';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/node_modules',
      '**/coverage',
      '**/.cache',
      '**/tmp',
      '**/temp',
      '**/playwright-report',
      '**/build',
      '**/.nx',
      '**/out',
      '**/*.min.js',
      'e2e/**/results',
      'e2e/**',
      'apps/app-gateway/test-results/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      // In CI, disable boundaries rule to avoid ProjectGraph lookups
      '@nx/enforce-module-boundaries': disableNxBoundaries
        ? 'off'
        : [
            'warn',
            {
              enforceBuildableLibDependency: false,
              allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
              depConstraints: [
                {
                  sourceTag: '*',
                  onlyDependOnLibsWithTags: ['*'],
                },
              ],
            },
          ],
      // Tone down common TypeScript strictness-related lint errors
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
    },
  },
  // In CI, avoid type-aware linting to speed up and prevent tsconfig graph scans
  disableTypeAware
    ? {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
          parserOptions: {
            project: undefined,
          },
        },
      }
    : {},
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    rules: {},
  },
];
