export default {
  displayName: 'report-generator-svc',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/report-generator-svc',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/index.ts',
    '!src/report-generator/report-generator.service.contracts.ts', // Contracts/interfaces only
    '!src/report-generator/performance-monitor.service.ts', // Monitoring utility
    '!src/report-generator/gridfs.service.ts', // MongoDB GridFS integration
    '!src/report-generator/llm.service.ts', // External LLM API integration
    '!src/report-generator/report-analytics.repository.ts', // Analytics repository
    '!src/report-generator/report.repository.ts', // Data repository
    '!src/app/reports.controller.ts', // Admin REST controller (requires full HTTP mocking)
  ],
  // Coverage threshold lowered due to infrastructure-heavy code (Puppeteer, ExcelJS, LLM)
  // Integration tests recommended for full coverage of PDF/Excel generation paths
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 75,
      lines: 55,
      statements: 55,
    },
  },
};
