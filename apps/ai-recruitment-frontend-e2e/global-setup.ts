import { startMockServer } from './mock-server';
import { waitForServerReady } from './browser-stability';
import { portManager } from './port-manager';
import {
  validateTestEnvironment,
  logTestEnvironment,
} from './test-environment';
import { getTestingEnvironment } from './testing-env';

async function globalSetup() {
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

  let testingEnv = getTestingEnvironment();
  const useRealAPI = testingEnv.useRealApi;
  const skipWebServer = testingEnv.skipWebServer || useRealAPI;
  let mockServerPort: number | null = testingEnv.mockApiPort ?? null;
  let devServerPort: number | null = testingEnv.devServerPort ?? null;

  if (!useRealAPI) {
    console.log('🚀 Starting Mock API Server with dynamic port allocation...');

    try {
      // Start mock server with dynamic port allocation
      mockServerPort = await startMockServer();
      console.log(
        `✅ Mock API Server started on dynamically allocated port ${mockServerPort}`,
      );

      // Set environment variable for tests to use
      process.env.MOCK_API_PORT = mockServerPort.toString();
      process.env.MOCK_API_URL = `http://localhost:${mockServerPort}`;
      testingEnv = getTestingEnvironment();

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
          process.env.MOCK_API_PORT = mockServerPort.toString();
          process.env.MOCK_API_URL = `http://localhost:${mockServerPort}`;
          testingEnv = getTestingEnvironment();

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
      process.env.GATEWAY_PORT = gatewayPort.toString();
      testingEnv = getTestingEnvironment();

      const gatewayHealthUrl =
        testingEnv.gatewayHealthUrl ||
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
        testingEnv.gatewayHealthUrl || 'http://localhost:3000/api/auth/health';
      console.log(`⏳ Checking fallback gateway at ${fallbackUrl}...`);
      const ok = await waitForServerReady(fallbackUrl, 90);
      if (!ok) {
        console.warn('⚠️ Fallback gateway check also failed');
      }
    }
  }

  // Handle dev server with dynamic port allocation
  if (!skipWebServer) {
    console.log('🎯 Configuring development server...');

    try {
      if (testingEnv.devServerPort) {
        devServerPort = testingEnv.devServerPort;
        console.log(
          `📝 Dev server port preconfigured via env: ${devServerPort}`,
        );
      } else {
        // Try to allocate dev server port dynamically
        devServerPort = await portManager.allocatePort('dev-server');
        process.env.DEV_SERVER_PORT = devServerPort.toString();
        testingEnv = getTestingEnvironment();
      }

      process.env.PLAYWRIGHT_BASE_URL = `http://localhost:${devServerPort}`;
      testingEnv = getTestingEnvironment();

      console.log(`📝 Dev server will use port ${devServerPort}`);
    } catch (error) {
      console.warn(
        '⚠️ Could not allocate dev server port, using default:',
        error,
      );

      // Fall back to checking if the default port is available
      const defaultPort = 4202;
      const isDefaultAvailable = await portManager.isPortAvailable(defaultPort);

      if (!isDefaultAvailable) {
        console.warn(
          `⚠️ Default dev server port ${defaultPort} is occupied, attempting cleanup...`,
        );
        await portManager.forceKillPort(defaultPort);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      devServerPort = testingEnv.devServerPort ?? defaultPort;
      testingEnv = getTestingEnvironment();
    }

    if (devServerPort === null) {
      devServerPort = testingEnv.devServerPort ?? 4202;
    }
    process.env.DEV_SERVER_PORT = devServerPort.toString();
    process.env.PLAYWRIGHT_BASE_URL = `http://localhost:${devServerPort}`;

    // Wait for dev server to be ready (if webServer is disabled, this will be external)
    const devServerUrl =
      testingEnv.playwrightBaseUrl || `http://localhost:${devServerPort}`;
    console.log(`⏳ Waiting for dev server at ${devServerUrl} to be ready...`);

    const isServerReady = await waitForServerReady(devServerUrl, 60);
    if (!isServerReady) {
      console.error(
        `❌ Dev server at ${devServerUrl} is not responding after 60 seconds`,
      );
      console.error(
        '   This may cause Firefox connection issues during parallel test execution',
      );
    } else {
      console.log(`✅ Dev server is ready and responsive`);
      // Add stability delay to ensure server is fully stable
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } else {
    delete process.env.DEV_SERVER_PORT;
    const externalBaseUrl =
      testingEnv.externalBaseUrl ||
      testingEnv.playwrightBaseUrl ||
      'http://localhost:4200';
    process.env.PLAYWRIGHT_BASE_URL = externalBaseUrl;
    testingEnv = getTestingEnvironment();
    console.log(
      `🎯 Skipping dev server startup. Using external base URL: ${testingEnv.playwrightBaseUrl}`,
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
