import type { Config } from 'jest';
import { getJestProjectsAsync } from '@nx/jest';

export default async (): Promise<Config> => ({
  projects: await getJestProjectsAsync(),
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  testTimeout: 30000,
  maxWorkers: 1, // 强制单进程运行避免资源竞争
  detectOpenHandles: process.env.DETECT_HANDLES === 'true',
  forceExit: false, // 禁用强制退出，确保清理完成
});
