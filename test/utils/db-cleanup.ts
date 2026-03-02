// 数据库连接清理工具
import { registerCleanup } from './cleanup';

/**
 * MongoDB client interface with cleanup method
 */
interface MongoClientLike {
  close: () => Promise<void>;
}

/**
 * MongoDB连接清理
 */
export const setupMongoCleanup = (mongoClient: MongoClientLike | null | undefined): void => {
  registerCleanup(async () => {
    if (mongoClient) {
      try {
        await mongoClient.close();
      } catch (error) {
        console.warn('MongoDB关闭警告:', error);
      }
    }
  });
};

/**
 * Redis client interface with cleanup methods
 */
interface RedisClientLike {
  quit?: () => Promise<void>;
  disconnect?: () => Promise<void>;
}

/**
 * Redis连接清理
 */
export const setupRedisCleanup = (redisClient: RedisClientLike | null | undefined): void => {
  registerCleanup(async () => {
    if (redisClient) {
      try {
        if (typeof redisClient.quit === 'function') {
          await redisClient.quit();
        } else if (typeof redisClient.disconnect === 'function') {
          await redisClient.disconnect();
        }
      } catch (error) {
        console.warn('Redis关闭警告:', error);
      }
    }
  });
};

/**
 * TypeORM DataSource interface with cleanup methods
 */
interface DataSourceLike {
  isInitialized: boolean;
  destroy: () => Promise<void>;
}

/**
 * 数据源清理（TypeORM等）
 */
export const setupDataSourceCleanup = (dataSource: DataSourceLike | null | undefined): void => {
  registerCleanup(async () => {
    if (dataSource && dataSource.isInitialized) {
      try {
        await dataSource.destroy();
      } catch (error) {
        console.warn('DataSource关闭警告:', error);
      }
    }
  });
};

/**
 * Prisma client interface with cleanup method
 */
interface PrismaClientLike {
  $disconnect: () => Promise<void>;
}

/**
 * Prisma客户端清理
 */
export const setupPrismaCleanup = (prisma: PrismaClientLike | null | undefined): void => {
  registerCleanup(async () => {
    if (prisma) {
      try {
        await prisma.$disconnect();
      } catch (error) {
        console.warn('Prisma关闭警告:', error);
      }
    }
  });
};

/**
 * Connection pool interface with cleanup methods
 */
interface PoolLike {
  end?: () => Promise<void>;
  close?: () => Promise<void>;
}

/**
 * 连接池清理
 */
export const setupPoolCleanup = (pool: PoolLike | null | undefined): void => {
  registerCleanup(async () => {
    if (pool) {
      try {
        if (typeof pool.end === 'function') {
          await pool.end();
        } else if (typeof pool.close === 'function') {
          await pool.close();
        }
      } catch (error) {
        console.warn('连接池关闭警告:', error);
      }
    }
  });
};