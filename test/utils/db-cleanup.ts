// 数据库连接清理工具
import { registerCleanup } from './cleanup';

/**
 * MongoDB连接清理
 */
export const setupMongoCleanup = (mongoClient: any): void => {
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
 * Redis连接清理
 */
export const setupRedisCleanup = (redisClient: any): void => {
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
 * 数据源清理（TypeORM等）
 */
export const setupDataSourceCleanup = (dataSource: any): void => {
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
 * Prisma客户端清理
 */
export const setupPrismaCleanup = (prisma: any): void => {
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
 * 连接池清理
 */
export const setupPoolCleanup = (pool: any): void => {
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