import playwright from 'eslint-plugin-playwright';
import baseConfig from '../../eslint.config.mjs';

export default [
  playwright.configs['flat/recommended'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.js', '**/*.mjs'],
    // Override or add rules here
    rules: {
      // Downgrade Playwright rules to warnings for gradual migration
      'playwright/no-networkidle': 'warn',
      'playwright/prefer-web-first-assertions': 'warn',
      'playwright/valid-title': 'warn',
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-conditional-expect': 'off',
      'playwright/no-skipped-test': 'off',
      'playwright/no-wait-for-timeout': 'off',
      // Allow empty functions in test files
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      // Allow let for reassignment
      'prefer-const': 'off',
    },
  },
];
