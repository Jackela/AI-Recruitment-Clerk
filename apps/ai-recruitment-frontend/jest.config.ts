import { createCjsPreset } from 'jest-preset-angular/presets/index.js';

const angularPreset = createCjsPreset({
  tsconfig: '<rootDir>/tsconfig.spec.json',
});

export default {
  ...angularPreset,
  displayName: 'ai-recruitment-frontend',
  resolver: '@nx/jest/plugins/resolver',
  setupFiles: ['<rootDir>/../../test/jest-global-setup.cjs'],
  setupFilesAfterEnv: [
    '<rootDir>/src/test-setup.ts',
    '<rootDir>/../../jest.setup.ts',
  ],
  globalTeardown: '<rootDir>/../../test/jest-global-teardown.cjs',
  coverageDirectory: '../../coverage/apps/ai-recruitment-frontend',
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.integration\\.spec\\.ts$',
    '<rootDir>/src/app/store/resumes/resume.selectors.spec.ts',
    '<rootDir>/src/app/services/api.service.spec.ts',
    '<rootDir>/src/app/services/file-upload.service.spec.ts',
    '<rootDir>/src/app/pages/jobs/create-job/create-job.component.spec.ts',
    '<rootDir>/src/app/directives/pull-to-refresh.directive.spec.ts',
    '<rootDir>/src/app/components/shared/form-example/form-example.component.spec.ts',
    '<rootDir>/src/app/components/privacy/consent-management.component.spec.ts',
    '<rootDir>/src/app/directives/validation/validation-feedback.component.spec.ts',
  ],
};
