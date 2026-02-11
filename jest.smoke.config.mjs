/**
 * Jest Smoke Test Configuration
 *
 * Purpose: Run a minimal subset of critical tests for fast local iteration
 * Runtime: ~10-15 seconds (vs ~30s for full test suite)
 *
 * Smoke tests should verify:
 * - Core compilation (no syntax errors)
 * - Critical domain logic
 * - Key shared libraries
 * - Basic application initialization
 *
 * WHEN TO USE SMOKE TESTS:
 * - During active development (run on every save)
 * - Before committing (quick sanity check)
 * - When refactoring non-critical code
 * - TDD red-green-refactor cycles
 *
 * WHEN TO USE FULL SUITE:
 * - Before pushing (always run full suite)
 * - PR validation (CI runs full suite)
 * - After completing a feature
 * - When debugging test failures
 */

const baseProjects = [
  // Core shared libraries (test these first - they're foundational)
  '<rootDir>/libs/api-contracts/jest.config.cjs',        // API contracts (validates TypeScript compilation)
  '<rootDir>/libs/shared-dtos/jest.config.js',           // Shared DTOs (core data structures)
  '<rootDir>/libs/infrastructure-shared/jest.config.ts', // Infrastructure (Redis, caching)

  // Critical domain libraries (core business logic)
  '<rootDir>/libs/user-management-domain/jest.config.ts', // User management (authentication)
  '<rootDir>/libs/job-management-domain/jest.config.ts',  // Job management (core domain)
  '<rootDir>/libs/candidate-scoring-domain/jest.config.ts', // Scoring (core feature)

  // Core applications (test these last - they depend on libs)
  '<rootDir>/apps/app-gateway/jest.config.ts',           // API Gateway (main entry point)
  '<rootDir>/apps/ai-recruitment-frontend/jest.config.ts', // Frontend (user interface)
];

export default {
  projects: baseProjects,
  passWithNoTests: true,
  maxWorkers: 1, // Run tests serially for consistent results
  testTimeout: 10000, // 10 second timeout per test (fail fast)
  verbose: false,    // Reduce output for faster scanning
  bail: true,        // Stop on first failure (fast feedback)
};
