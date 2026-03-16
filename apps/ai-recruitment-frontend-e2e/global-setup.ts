import { startMockServer } from './mock-server.js';
import { waitForServerReady } from './browser-stability.js';
import { portManager } from './port-manager.js';
import {
  validateTestEnvironment,
  logTestEnvironment,
} from './test-environment.js';

async function globalSetup(): Promise<void> {
  console.log('🚀 Starting E2E test environment setup...');

  try {
    // Comprehensive pre-setup cleanup to prevent port conflicts
    console.log('🧹 Performing pre-setup port cleanup...');
    await portManager.cleanupAllPorts();

    // Generate initial port status report
    const initialReport = await portManager.generatePortReport();
    console.log('📊 Initial port status:\n' + initialReport);
  } catch (error) {
    console.error('❌ Pre-setup cleanup failed:', error);
    // Continue with setup but log the error
  }

  const useRealAPI = process.env['E2E_USE_REAL_API'] === 'true';
  const skipWebServer =
    process.env['E2E_SKIP_WEBSERVER'] === 'true' || useRealAPI;

  let mockServerPort: number | null = null;

  if (!useRealAPI) {
    console.log('🚀 Starting Mock API Server with dynamic port allocation...');

    try {
      // Start mock server with dynamic port allocation
      mockServerPort = await startMockServer();
      console.log(
        `✅ Mock API Server started on dynamically allocated port ${mockServerPort}`,
      );

      // Set environment variable for tests to use
      process.env['MOCK_API_PORT'] = mockServerPort.toString();
      process.env['MOCK_API_URL'] = `http://localhost:${mockServerPort}`;

      // Wait for mock server to be ready with dynamic URL
      const mockServerUrl = `http://localhost:${mockServerPort}/api/health`;
      console.log(
        `⏳ Waiting for mock server at ${mockServerUrl} to be ready...`,
      );

      const isMockReady = await portManager.waitForService('mock-api', 30000);
      if (!isMockReady) {
        console.error('❌ Mock server health check failed after 30 seconds');
        // Attempt one retry with port cleanup
        console.log('🔄 Attempting mock server recovery...');
        await portManager.cleanupAllPorts();
        await new Promise((resolve) => setTimeout(resolve, 3000));

        try {
          mockServerPort = await startMockServer();
          process.env['MOCK_API_PORT'] = mockServerPort.toString();
          process.env['MOCK_API_URL'] = `http://localhost:${mockServerPort}`;

          const retryReady = await portManager.waitForService(
            'mock-api',
            15000,
          );
          if (!retryReady) {
            throw new Error(
              'Mock server failed to start after recovery attempt',
            );
          }
          console.log('✅ Mock API Server recovered and ready');
        } catch (retryError) {
          throw new Error(`Mock server failed to start: ${retryError.message}`);
        }
      } else {
        console.log('✅ Mock API Server is ready and healthy');
      }
    } catch (error) {
      console.error('❌ Failed to start mock server:', error);
      throw error;
    }
  } else {
    console.log('🔗 Using real API endpoints for E2E testing');

    // Try to allocate gateway port for monitoring
    try {
      const gatewayPort = await portManager.allocatePort('gateway');
      process.env['GATEWAY_PORT'] = gatewayPort.toString();

      const gatewayHealthUrl =
        process.env['GATEWAY_HEALTH_URL'] ||
        `http://localhost:${gatewayPort}/api/auth/health`;

      console.log(`⏳ Waiting for gateway at ${gatewayHealthUrl}...`);
      const ok = await waitForServerReady(gatewayHealthUrl, 90);
      if (!ok) {
        console.warn('⚠️ Gateway did not report ready within timeout');
      } else {
        console.log('✅ Gateway is ready');
      }
    } catch (error) {
      console.warn('⚠️ Could not allocate gateway port for monitoring:', error);

      // Fall back to checking default port
      const fallbackUrl =
        process.env['GATEWAY_HEALTH_URL'] ||
        'http://localhost:3000/api/auth/health';
      console.log(`⏳ Checking fallback gateway at ${fallbackUrl}...`);
      const ok = await waitForServerReady(fallbackUrl, 90);
      if (!ok) {
        console.warn('⚠️ Fallback gateway check also failed');
      }
    }
  }

  // Dev server is now managed by Playwright's webServer configuration
  // No need for manual startup anymore
  if (skipWebServer) {
    // External server mode
    const externalBaseUrl =
      process.env['PLAYWRIGHT_BASE_URL'] ||
      process.env['E2E_EXTERNAL_BASE_URL'] ||
      'http://localhost:4200';
    console.log(
      `🎯 Skipping dev server startup. Using external base URL: ${externalBaseUrl}`,
    );
  } else {
    console.log(
      '✅ Playwright webServer will manage dev server startup and readiness checks.',
    );
  }

  // Final health check for all services
  console.log('🏥 Performing final health checks...');
  try {
    const healthResults = await portManager.healthCheckServices();

    let allHealthy = true;
    for (const [service, healthy] of healthResults) {
      const status = healthy ? '✅' : '❌';
      console.log(`${status} ${service}: ${healthy ? 'Healthy' : 'Unhealthy'}`);
      if (!healthy) allHealthy = false;
    }

    if (!allHealthy) {
      console.warn(
        '⚠️ Some services are not healthy, but continuing with test setup',
      );
    }
  } catch (error) {
    console.warn('⚠️ Health check failed:', error);
  }

  // Generate final setup report
  try {
    const finalReport = await portManager.generatePortReport();
    console.log('📊 Final setup port status:\n' + finalReport);
  } catch (error) {
    console.warn('⚠️ Could not generate final port report:', error);
  }

  console.log('✅ E2E test environment setup completed successfully');

  // Validate and log final environment configuration
  try {
    validateTestEnvironment();
    logTestEnvironment();
  } catch (error) {
    console.warn('⚠️ Environment validation warning:', error);
    // Continue even if validation fails
  }
}

export default globalSetup;
