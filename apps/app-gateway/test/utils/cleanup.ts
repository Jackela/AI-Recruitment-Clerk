/**
 * 统一清理器 - 防止Node.js进程句柄泄露
 */
type Cleanup = () => Promise<void> | void;
const cleaners: Cleanup[] = [];

export const registerCleanup = (fn: Cleanup): void => {
  cleaners.push(fn);
};

export const runCleanups = async (): Promise<void> => {
  console.log(`🧹 Running ${cleaners.length} cleanup functions...`);

  for (const fn of cleaners.splice(0)) {
    try {
      await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('Cleanup function failed:', message);
    }
  }

  console.log('✅ All cleanup functions completed');
};

// 全局进程清理
const globalCleanup = async () => {
  await runCleanups();

  // 强制关闭所有活动句柄
  if (process.env.NODE_ENV === 'test') {
    setTimeout(() => {
      console.log('🔴 Force exit after cleanup timeout');
      process.exit(0);
    }, 1000);
  }
};

process.on('SIGTERM', globalCleanup);
process.on('SIGINT', globalCleanup);
process.on('beforeExit', globalCleanup);
