// 测试清理工具 - 标准化资源释放机制
// 根据最佳实践实施严格的teardown

type Cleanup = () => Promise<void> | void;
const cleaners: Cleanup[] = [];

/**
 * 注册清理函数
 * 所有外部资源创建处必须配套registerCleanup
 */
export const registerCleanup = (fn: Cleanup): void => {
  cleaners.push(fn);
};

/**
 * 执行所有清理函数
 * 按注册的反序执行（后进先出）
 */
export const runCleanups = async (): Promise<void> => {
  const errors: Error[] = [];
  
  // 反序执行清理，确保依赖关系正确
  while (cleaners.length > 0) {
    const cleanup = cleaners.pop()!;
    try {
      await cleanup();
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  // 如果有清理错误，合并报告
  if (errors.length > 0) {
    const errorMessage = errors.map(e => e.message).join('; ');
    throw new Error(`Cleanup errors: ${errorMessage}`);
  }
};

/**
 * 清空所有清理函数（仅用于测试内部）
 */
export const clearCleanups = (): void => {
  cleaners.splice(0);
};

/**
 * 获取待清理任务数量（用于调试）
 */
export const getPendingCleanups = (): number => {
  return cleaners.length;
};

// 进程级清理（捕获未处理的退出）
let processCleanupRegistered = false;

export const registerProcessCleanup = (): void => {
  if (processCleanupRegistered) return;
  processCleanupRegistered = true;
  
  const cleanup = async () => {
    if (cleaners.length > 0) {
      console.warn(`⚠️  进程退出时发现 ${cleaners.length} 个未清理的资源`);
      await runCleanups();
    }
  };
  
  // 正常退出
  process.on('exit', () => {
    if (cleaners.length > 0) {
      console.error(`❌ 进程退出时仍有 ${cleaners.length} 个未清理资源`);
    }
  });
  
  // 异常退出
  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });
  
  // 未捕获异常
  process.on('uncaughtException', async (error) => {
    console.error('未捕获异常:', error);
    await cleanup();
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason) => {
    console.error('未处理的Promise拒绝:', reason);
    await cleanup();
    process.exit(1);
  });
};