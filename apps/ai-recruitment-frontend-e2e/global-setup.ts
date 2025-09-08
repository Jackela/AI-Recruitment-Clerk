import { startMockServer } from './mock-server';
import { waitForServerReady } from './browser-stability';

async function globalSetup() {
  // Only start mock server if not testing against real backend
  const useRealAPI = process.env.E2E_USE_REAL_API === 'true';

  if (!useRealAPI) {
    console.log('🚀 Starting Mock API Server for E2E testing...');
    startMockServer();
    console.log('✅ Mock API Server started successfully');
  } else {
    console.log('🔗 Using real API endpoints for E2E testing');
  }

  // Fix: Wait for dev server to be fully ready before starting tests
  const devServerUrl =
    process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4202';
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
    // Add extra delay to ensure server is fully stable
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

export default globalSetup;
