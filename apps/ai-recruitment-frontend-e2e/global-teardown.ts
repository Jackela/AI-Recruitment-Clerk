import { stopMockServer } from './mock-server';

async function globalTeardown() {
  const useRealAPI = process.env.E2E_USE_REAL_API === 'true';
  
  if (!useRealAPI) {
    console.log('🛑 Stopping Mock API Server...');
    stopMockServer();
    console.log('✅ Mock API Server stopped successfully');
  }
  
  // Fix: Clean up ports to prevent connection issues in subsequent runs
  try {
    const { cleanup } = await import('./cleanup-ports.mjs');
    await cleanup();
  } catch (error) {
    console.warn('⚠️ Port cleanup failed:', (error as Error).message);
  }
}

export default globalTeardown;