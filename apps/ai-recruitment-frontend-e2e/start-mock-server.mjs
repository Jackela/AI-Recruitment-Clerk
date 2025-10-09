import { startMockServer } from './mock-server.ts';

// Start the mock server
console.log('🚀 Starting standalone mock server...');
startMockServer();

// Keep the server running
console.log('✅ Mock server is running. Press Ctrl+C to stop.');
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping mock server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping mock server...');
  process.exit(0);
});