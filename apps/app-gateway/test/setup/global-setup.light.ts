/**
 * Performs the global setup operation.
 * @returns The result of the operation.
 */
export default async function globalSetup() {
  // Minimal global setup for performance/integration: no DB startup
  process.env.NODE_ENV = 'test';
  process.env.SKIP_DB = process.env.SKIP_DB || 'true';
}
