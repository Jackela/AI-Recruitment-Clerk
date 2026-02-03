import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  {
    // Ignore TypeScript-specific rules for service worker JavaScript files
    files: ['**/sw.js', '**/sw-enhanced.js'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'arc',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'warn', // Downgrade to warning for gradual migration
        {
          type: 'element',
          prefix: 'arc',
          style: 'kebab-case',
        },
      ],
      // Downgrade Angular rules to warnings for gradual migration
      '@angular-eslint/prefer-inject': 'warn',
      '@angular-eslint/no-inputs-metadata-property': 'warn',
      '@angular-eslint/no-outputs-metadata-property': 'warn',
      '@angular-eslint/no-empty-lifecycle-method': 'warn',
      '@angular-eslint/no-output-on-prefix': 'warn',
      '@angular-eslint/no-output-native': 'warn',
      '@angular-eslint/prefer-standalone': 'warn',
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here - downgrade accessibility rules for gradual migration
    rules: {
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
      '@angular-eslint/template/label-has-associated-control': 'warn',
      '@angular-eslint/template/no-negated-async': 'warn',
      '@angular-eslint/template/valid-aria': 'warn',
    },
  },
];
