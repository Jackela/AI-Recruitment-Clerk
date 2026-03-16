/**
 * Database Setup Utilities
 *
 * Shared database configuration and setup utilities for integration tests.
 * Provides TypeORM configuration, connection management, and transaction rollback.
 *
 * @module DatabaseSetup
 * @since v1.0.0
 */

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions, QueryRunner } from 'typeorm';

/**
 * TypeORM configuration for test environment.
 * Uses SQLite in-memory database for fast, isolated tests.
 *
 * @see {@link https://typeorm.io/} for TypeORM documentation
 */
export const testDatabaseConfig: TypeOrmModuleOptions = {
  type: 'sqlite',
  database: ':memory:',
  dropSchema: true,
  synchronize: true,
  logging: false,
  entities: [],
};

/**
 * PostgreSQL configuration for tests (alternative to SQLite).
 * Use when testing PostgreSQL-specific features.
 */
export const testPostgresConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
  username: process.env.TEST_DB_USERNAME || 'test',
  password: process.env.TEST_DB_PASSWORD || 'test',
  database: process.env.TEST_DB_NAME || 'ai_recruitment_test',
  dropSchema: true,
  synchronize: true,
  logging: false,
  entities: [],
};

/**
 * Active data source for the current test suite.
 * Managed by setupTestDatabase and cleanupDatabase.
 */
let activeDataSource: DataSource | null = null;

/**
 * Active query runner for transaction management.
 * Managed by startTransaction and rollbackTransaction.
 */
let activeQueryRunner: QueryRunner | null = null;

/**
 * Sets up an in-memory test database with TypeORM.
 * Creates a DataSource connection and initializes it.
 *
 * @param entities - Array of entity classes to register
 * @param configOverrides - Optional configuration overrides
 * @returns Promise resolving to the initialized DataSource
 *
 * @example
 * ```typescript
 * let dataSource: DataSource;
 *
 * beforeAll(async () => {
 *   dataSource = await setupTestDatabase([User, Job, Resume]);
 * });
 *
 * afterAll(async () => {
 *   await cleanupDatabase();
 * });
 * ```
 */
export const setupTestDatabase = async (
  entities: Array<new (...args: unknown[]) => unknown> = [],
  configOverrides: Partial<TypeOrmModuleOptions> = {},
): Promise<DataSource> => {
  if (activeDataSource?.isInitialized) {
    await activeDataSource.destroy();
  }

  const config: DataSourceOptions = {
    type: 'sqlite',
    database: ':memory:',
    dropSchema: true,
    synchronize: true,
    logging: false,
    entities,
    ...configOverrides,
  } as DataSourceOptions;

  activeDataSource = new DataSource(config);
  await activeDataSource.initialize();

  return activeDataSource;
};

/**
 * Cleans up the test database connection.
 * Destroys the DataSource and releases all resources.
 * Call this in afterAll or afterEach.
 */
export const cleanupDatabase = async (): Promise<void> => {
  if (activeQueryRunner) {
    await activeQueryRunner.release();
    activeQueryRunner = null;
  }

  if (activeDataSource?.isInitialized) {
    await activeDataSource.destroy();
    activeDataSource = null;
  }
};

/**
 * Clears all data from the database without dropping tables.
 * Useful for cleaning between tests while keeping schema.
 *
 * @returns Promise that resolves when cleanup is complete
 */
export const clearDatabase = async (): Promise<void> => {
  if (!activeDataSource?.isInitialized) {
    throw new Error('Database not initialized. Call setupTestDatabase first.');
  }

  const queryRunner = activeDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Get all table names
    const tables = await queryRunner.getTables();

    // Disable foreign key checks for SQLite
    await queryRunner.query('PRAGMA foreign_keys = OFF');

    // Clear each table
    for (const table of tables) {
      if (table.name !== 'sqlite_sequence') {
        await queryRunner.query(`DELETE FROM "${table.name}"`);
      }
    }

    // Re-enable foreign key checks
    await queryRunner.query('PRAGMA foreign_keys = ON');
  } finally {
    await queryRunner.release();
  }
};

/**
 * Starts a database transaction for test isolation.
 * Changes made during the transaction will be rolled back.
 *
 * @returns Promise resolving to the QueryRunner managing the transaction
 *
 * @example
 * ```typescript
 * beforeEach(async () => {
 *   await startTransaction();
 * });
 *
 * afterEach(async () => {
 *   await rollbackTransaction();
 * });
 * ```
 */
export const startTransaction = async (): Promise<QueryRunner> => {
  if (!activeDataSource?.isInitialized) {
    throw new Error('Database not initialized. Call setupTestDatabase first.');
  }

  activeQueryRunner = activeDataSource.createQueryRunner();
  await activeQueryRunner.connect();
  await activeQueryRunner.startTransaction();

  return activeQueryRunner;
};

/**
 * Rolls back the active transaction.
 * Reverts all changes made since startTransaction was called.
 * Releases the QueryRunner after rollback.
 */
export const rollbackTransaction = async (): Promise<void> => {
  if (!activeQueryRunner) {
    return;
  }

  try {
    await activeQueryRunner.rollbackTransaction();
  } finally {
    await activeQueryRunner.release();
    activeQueryRunner = null;
  }
};

/**
 * Commits the active transaction.
 * Use when you need to persist changes across test boundaries.
 * Generally prefer rollbackTransaction for test isolation.
 */
export const commitTransaction = async (): Promise<void> => {
  if (!activeQueryRunner) {
    return;
  }

  try {
    await activeQueryRunner.commitTransaction();
  } finally {
    await activeQueryRunner.release();
    activeQueryRunner = null;
  }
};

/**
 * Gets the currently active DataSource.
 *
 * @returns The active DataSource or null if not initialized
 */
export const getDataSource = (): DataSource | null => activeDataSource;

/**
 * Gets the currently active QueryRunner (if in a transaction).
 *
 * @returns The active QueryRunner or null if not in a transaction
 */
export const getQueryRunner = (): QueryRunner | null => activeQueryRunner;

/**
 * Executes a callback within a database transaction.
 * Automatically rolls back after the callback completes.
 *
 * @param callback - Function to execute within the transaction
 * @returns Promise resolving to the callback's return value
 *
 * @example
 * ```typescript
 * await withTransaction(async (queryRunner) => {
 *   const repo = queryRunner.manager.getRepository(User);
 *   await repo.save(user);
 *   // Changes will be automatically rolled back
 * });
 * ```
 */
export const withTransaction = async <T>(
  callback: (queryRunner: QueryRunner) => Promise<T>,
): Promise<T> => {
  const queryRunner = await startTransaction();

  try {
    const result = await callback(queryRunner);
    return result;
  } finally {
    await rollbackTransaction();
  }
};

/**
 * Seeds the database with initial test data.
 * Runs the provided seeder function within a transaction.
 *
 * @param seeder - Async function that populates the database
 * @returns Promise that resolves when seeding is complete
 *
 * @example
 * ```typescript
 * await seedDatabase(async (queryRunner) => {
 *   const userRepo = queryRunner.manager.getRepository(User);
 *   await userRepo.save(createUser());
 * });
 * ```
 */
export const seedDatabase = async (
  seeder: (queryRunner: QueryRunner) => Promise<void>,
): Promise<void> => {
  await withTransaction(async (queryRunner) => {
    await seeder(queryRunner);
    await queryRunner.commitTransaction();
  });
};
