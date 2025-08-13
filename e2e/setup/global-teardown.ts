import { execSync } from 'child_process';
import { join } from 'path';

/**
 * Global teardown for E2E tests
 * Cleanup test environment and stop services
 */
export default async function globalTeardown(): Promise<void> {
  console.log('🧹 Starting E2E test environment teardown...');

  const projectRoot = join(__dirname, '../..');

  try {
    // Stop and remove test containers
    console.log('🛑 Stopping test services...');
    execSync('docker-compose -f e2e/docker-compose.e2e.yml down -v', {
      cwd: projectRoot,
      stdio: 'inherit',
      timeout: 60000 // 1 minute timeout
    });

    // Remove test images (optional, comment out to preserve for faster subsequent runs)
    console.log('🗑️ Cleaning up test images...');
    try {
      execSync('docker system prune -f', {
        cwd: projectRoot,
        stdio: 'pipe'
      });
    } catch (error) {
      console.warn('Warning: Failed to clean up Docker images:', error.message);
    }

    console.log('✅ E2E test environment teardown completed successfully!');

  } catch (error) {
    console.error('❌ E2E teardown failed:', error);
    // Don't throw here to allow test results to be reported
  }
}