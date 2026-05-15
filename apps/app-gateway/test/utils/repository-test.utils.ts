/**
 * Repository Test Utilities
 *
 * Shared utilities for repository testing including:
 * - Mock repository factory
 * - Test database setup/cleanup
 * - Common query builder mock helpers
 *
 * @module RepositoryTestUtils
 * @since v1.0.0
 */

/**
 * Creates a fully mocked TypeORM repository with common methods.
 * Returns a mock repository with all essential CRUD operations pre-configured.
 *
 * @template T The entity type being mocked
 * @returns Mocked repository object with Jest spy functions
 *
 * @example
 * ```typescript
 * const repo = mockRepository<User>();
 * repo.find.mockResolvedValue([user1, user2]);
 * repo.findOne.mockResolvedValue(user1);
 * ```
 */
export const mockRepository = <_T = any>() => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  findBy: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  insert: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  countBy: jest.fn(),
  exists: jest.fn(),
  existsBy: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    inIds: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getCount: jest.fn(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
  })),
  metadata: {
    columns: [],
    relations: [],
  } as any,
  target: {} as any,
  manager: {} as any,
  queryRunner: undefined,
});

/**
 * Creates a mock query builder with fluent API for repository testing.
 * Allows building complex query chains for testing service layer logic.
 *
 * @template T The entity type being queried
 * @returns Mock query builder with chainable methods
 *
 * @example
 * ```typescript
 * const qb = mockQueryBuilder<User>();
 * qb.where.mockReturnThis();
 * qb.getMany.mockResolvedValue([user1, user2]);
 * ```
 */
export const mockQueryBuilder = <T = any>() => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  inIds: jest.fn().mockReturnThis(),
  getMany: jest.fn<Promise<T[]>, []>(),
  getOne: jest.fn<Promise<T | null>, []>(),
  getCount: jest.fn<Promise<number>, []>(),
  getRawMany: jest.fn<Promise<any[]>, []>(),
  getRawOne: jest.fn<Promise<any | null>, []>(),
  leftJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  innerJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  distinct: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  having: jest.fn().mockReturnThis(),
  setParameter: jest.fn().mockReturnThis(),
  setParameters: jest.fn().mockReturnThis(),
});

/**
 * Type for repository mock with all common methods.
 * Use this for typing repository mocks in test files.
 */
export type MockRepository<T = any> = ReturnType<typeof mockRepository<T>>;

/**
 * Type for query builder mock with chainable methods.
 * Use this for typing query builder mocks in test files.
 */
export type MockQueryBuilder<T = any> = ReturnType<typeof mockQueryBuilder<T>>;

/**
 * Resets all mock methods on a repository to their default state.
 * Call this in beforeEach to ensure clean state between tests.
 *
 * @param repo The mock repository to reset
 */
export const resetRepositoryMocks = <T>(repo: MockRepository<T>): void => {
  repo.find.mockReset();
  repo.findOne.mockReset();
  repo.findOneBy.mockReset();
  repo.findBy.mockReset();
  repo.save.mockReset();
  repo.delete.mockReset();
  repo.update.mockReset();
  repo.insert.mockReset();
  repo.remove.mockReset();
  repo.count.mockReset();
  repo.countBy.mockReset();
  repo.exists.mockReset();
  repo.existsBy.mockReset();
  repo.createQueryBuilder.mockClear();
};

/**
 * Sets up common repository method return values for a specific entity.
 * Useful for setting up default happy-path responses.
 *
 * @param repo The mock repository to configure
 * @param entity The entity to use for return values
 * @param entityArray Array of entities for list operations
 */
export const setupRepositoryDefaults = <T>(
  repo: MockRepository<T>,
  entity: T,
  entityArray: T[] = [entity],
): void => {
  repo.find.mockResolvedValue(entityArray);
  repo.findOne.mockResolvedValue(entity);
  repo.findOneBy.mockResolvedValue(entity);
  repo.findBy.mockResolvedValue(entityArray);
  repo.save.mockResolvedValue(entity);
  repo.delete.mockResolvedValue({ raw: {}, affected: 1 });
  repo.update.mockResolvedValue({ raw: {}, affected: 1, generatedMaps: [] });
  repo.insert.mockResolvedValue({ raw: {}, identifiers: [] });
  repo.remove.mockResolvedValue(entity);
  repo.count.mockResolvedValue(entityArray.length);
  repo.countBy.mockResolvedValue(entityArray.length);
  repo.exists.mockResolvedValue(true);
  repo.existsBy.mockResolvedValue(true);
};
