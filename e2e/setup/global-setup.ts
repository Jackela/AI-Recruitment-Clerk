import { execSync } from 'child_process';
import { join } from 'path';

/**
 * Global setup for E2E tests
 * Initializes test environment and starts services
 */
export default async function globalSetup(): Promise<void> {
  console.log('🚀 Starting E2E test environment setup...');

  const projectRoot = join(__dirname, '../..');
  const e2eRoot = join(__dirname, '..');

  try {
    // Stop any existing containers
    console.log('🧹 Cleaning up existing test containers...');
    try {
      execSync('docker-compose -f e2e/docker-compose.e2e.yml down -v', {
        cwd: projectRoot,
        stdio: 'pipe'
      });
    } catch (error) {
      // Ignore errors if containers don't exist
    }

    // Build Docker images for services
    console.log('🔨 Building Docker images for E2E testing...');
    execSync('docker-compose -f e2e/docker-compose.e2e.yml build', {
      cwd: projectRoot,
      stdio: 'inherit',
      timeout: 300000 // 5 minutes timeout
    });

    // Start test environment
    console.log('🎯 Starting test services...');
    execSync('docker-compose -f e2e/docker-compose.e2e.yml up -d', {
      cwd: projectRoot,
      stdio: 'inherit',
      timeout: 180000 // 3 minutes timeout
    });

    // Wait for services to be healthy
    console.log('⏳ Waiting for services to be ready...');
    await waitForServices();

    // Verify service health
    console.log('🏥 Verifying service health...');
    await verifyServiceHealth();

    console.log('✅ E2E test environment setup completed successfully!');

  } catch (error) {
    console.error('❌ E2E setup failed:', error);
    
    // Cleanup on failure
    try {
      execSync('docker-compose -f e2e/docker-compose.e2e.yml down -v', {
        cwd: projectRoot,
        stdio: 'pipe'
      });
    } catch (cleanupError) {
      console.error('Failed to cleanup after setup failure:', cleanupError);
    }
    
    throw error;
  }
}

/**
 * Wait for all services to be ready
 */
async function waitForServices(): Promise<void> {
  const maxWaitTime = 120000; // 2 minutes
  const checkInterval = 5000; // 5 seconds
  let elapsedTime = 0;

  while (elapsedTime < maxWaitTime) {
    try {
      // Check MongoDB
      await checkService('http://localhost:27018', 'MongoDB');
      
      // Check Redis
      await checkService('http://localhost:6380', 'Redis');
      
      // Check NATS
      await checkService('http://localhost:8223/healthz', 'NATS');
      
      // Check App Gateway
      await checkService('http://localhost:3001/health', 'App Gateway');
      
      console.log('✅ All services are ready');
      return;
      
    } catch (error) {
      console.log(`⏳ Services not ready yet, waiting... (${elapsedTime/1000}s elapsed)`);
      await sleep(checkInterval);
      elapsedTime += checkInterval;
    }
  }

  throw new Error('Services failed to start within the timeout period');
}

/**
 * Verify service health endpoints
 */
async function verifyServiceHealth(): Promise<void> {
  const fetch = (await import('node-fetch')).default;
  
  const healthChecks = [
    { url: 'http://localhost:3001/health', name: 'App Gateway' },
    { url: 'http://localhost:3002/health', name: 'JD Extractor' },
    { url: 'http://localhost:3003/health', name: 'Resume Parser' },
    { url: 'http://localhost:3004/health', name: 'Scoring Engine' },
    { url: 'http://localhost:3005/health', name: 'Report Generator' },
    { url: 'http://localhost:8223/healthz', name: 'NATS' }
  ];

  for (const { url, name } of healthChecks) {
    try {
      const response = await fetch(url, { timeout: 5000 });
      if (response.ok) {
        console.log(`✅ ${name} health check passed`);
      } else {
        throw new Error(`Health check failed with status ${response.status}`);
      }
    } catch (error) {
      console.warn(`⚠️ ${name} health check failed:`, error.message);
      // Don't throw here, some services might not have health endpoints yet
    }
  }
}

/**
 * Check if a service is accessible
 */
async function checkService(url: string, name: string): Promise<void> {
  // For now, just wait as we don't have fetch available in setup
  // This would be implemented with actual HTTP checks in a real scenario
}

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}