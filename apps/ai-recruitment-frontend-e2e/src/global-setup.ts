import { FullConfig } from '@playwright/test';
import { cleanupTestData } from './utils/cleanup';
import { getTestEnvironment } from './utils/environment';
import { UserFactory } from './factories/user.factory';
import { JobFactory } from './factories/job.factory';
import { ResumeFactory } from './factories/resume.factory';

async function globalSetup(_config: FullConfig) {
  console.log('🚀 Starting E2E test suite setup...');

  const env = getTestEnvironment();
  console.log(`📊 Test Environment: ${JSON.stringify(env, null, 2)}`);

  await cleanupFromPreviousRuns();

  resetAllFactories();

  registerCleanupHooks();

  console.log('✅ E2E test suite setup complete');
}

async function cleanupFromPreviousRuns(): Promise<void> {
  console.log('🧹 Cleaning up data from previous test runs...');
  try {
    const result = await cleanupTestData();
    console.log(`   Users deleted: ${result.usersDeleted}`);
    console.log(`   Jobs deleted: ${result.jobsDeleted}`);
    console.log(`   Resumes deleted: ${result.resumesDeleted}`);
    if (result.errors.length > 0) {
      console.warn('   Cleanup warnings:', result.errors);
    }
  } catch (error) {
    console.warn(
      '⚠️  Cleanup failed (non-critical):',
      error instanceof Error ? error.message : String(error),
    );
  }
}

function resetAllFactories(): void {
  UserFactory.resetCounter();
  JobFactory.resetCounter();
  ResumeFactory.resetCounter();
  console.log('🔄 All factories reset');
}

function registerCleanupHooks(): void {
  const cleanupHandler = async () => {
    console.log('\n🧹 Performing final cleanup...');
    try {
      const result = await cleanupTestData();
      console.log(
        `   Cleanup complete: ${result.usersDeleted} users, ${result.jobsDeleted} jobs, ${result.resumesDeleted} resumes removed`,
      );
    } catch (error) {
      console.error(
        '❌ Final cleanup failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exitCode = 1;
    }
  };

  process.on('exit', () => {
    console.log('📝 Process exiting...');
  });

  process.on('SIGINT', async () => {
    console.log('\n⛔ Interrupted by user');
    await cleanupHandler();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n⛔ Terminated');
    await cleanupHandler();
    process.exit(0);
  });

  process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught exception:', error);
    await cleanupHandler();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason) => {
    console.error('💥 Unhandled rejection:', reason);
    await cleanupHandler();
    process.exit(1);
  });

  console.log('🪝 Cleanup hooks registered');
}

export default globalSetup;
