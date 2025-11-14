import { getTestingEnvironment } from './testing-env';

/**
 * Test Environment Configuration
 *
 * Centralizes environment variable management and provides type-safe access
 * to test configuration including dynamically allocated ports.
 */

export interface TestEnvironment {
  mockApiPort?: number;
  mockApiUrl?: string;
  devServerPort?: number;
  gatewayPort?: number;
  playwrightBaseUrl: string;
  useRealApi: boolean;
  skipWebServer: boolean;
  isCI: boolean;
}

/**
 * Get current test environment configuration
 */
export function getTestEnvironment(): TestEnvironment {
  const env = getTestingEnvironment();

  return {
    mockApiPort: env.mockApiPort,
    mockApiUrl: env.mockApiUrl,
    devServerPort: env.devServerPort,
    gatewayPort: env.gatewayPort,
    playwrightBaseUrl: env.playwrightBaseUrl,
    useRealApi: env.useRealApi,
    skipWebServer: env.skipWebServer,
    isCI: env.isCi,
  };
}

/**
 * Get API base URL for tests
 */
export function getApiBaseUrl(): string {
  const env = getTestEnvironment();

  if (env.useRealApi) {
    return env.gatewayPort
      ? `http://localhost:${env.gatewayPort}`
      : 'http://localhost:3000';
  }

  return env.mockApiUrl || `http://localhost:${env.mockApiPort || 3001}`;
}

/**
 * Validate test environment is properly configured
 */
export function validateTestEnvironment(): void {
  const env = getTestEnvironment();
  const issues: string[] = [];

  if (!env.useRealApi && !env.mockApiPort) {
    issues.push('Mock API mode enabled but MOCK_API_PORT not set');
  }

  if (!env.devServerPort && !env.skipWebServer) {
    issues.push('Dev server required but DEV_SERVER_PORT not set');
  }

  if (env.useRealApi && !env.gatewayPort) {
    console.warn(
      '⚠️ Real API mode enabled but GATEWAY_PORT not set, using default',
    );
  }

  if (issues.length > 0) {
    throw new Error(
      `Test environment validation failed:\n${issues.join('\n')}`,
    );
  }
}

/**
 * Log current test environment for debugging
 */
export function logTestEnvironment(): void {
  const env = getTestEnvironment();

  console.log('🔧 Test Environment Configuration:');
  console.log(`   Mode: ${env.useRealApi ? 'Real API' : 'Mock API'}`);
  console.log(`   Base URL: ${env.playwrightBaseUrl}`);
  console.log(`   API URL: ${getApiBaseUrl()}`);
  console.log(`   Mock API Port: ${env.mockApiPort || 'N/A'}`);
  console.log(`   Dev Server Port: ${env.devServerPort || 'N/A'}`);
  console.log(`   Gateway Port: ${env.gatewayPort || 'N/A'}`);
  console.log(`   Skip Web Server: ${env.skipWebServer}`);
  console.log(`   CI Mode: ${env.isCI}`);
}
