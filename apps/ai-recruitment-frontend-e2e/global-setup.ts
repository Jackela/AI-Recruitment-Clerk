import { startMockServer } from './mock-server';

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
}

export default globalSetup;