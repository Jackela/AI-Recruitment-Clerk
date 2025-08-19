// Jest配置 - Wave 4测试框架集成 (简化版)
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.spec.js',
    '**/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'apps/**/*.{ts,js}',
    '!apps/**/*.spec.ts',
    '!apps/**/*.test.ts',
    '!apps/**/node_modules/**',
    '!**/dist/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'json-summary'
  ],
  testTimeout: 10000,
  maxWorkers: '50%',
  verbose: true,
  
  // CI模式优化
  passWithNoTests: true,
  bail: process.env.CI === 'true' ? 1 : 0,
  collectCoverage: process.env.CI === 'true',
  
  // 处理进程清理
  forceExit: false,
  detectOpenHandles: false,
  
  // 性能优化
  cache: true
};