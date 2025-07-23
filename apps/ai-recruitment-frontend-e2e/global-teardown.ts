import { stopMockServer } from './mock-server';

async function globalTeardown() {
  const useRealAPI = process.env.E2E_USE_REAL_API === 'true';
  
  if (!useRealAPI) {
    console.log('🛑 Stopping Mock API Server...');
    stopMockServer();
    console.log('✅ Mock API Server stopped successfully');
  }
}

export default globalTeardown;