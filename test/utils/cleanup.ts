/**
 * @file Universal Cleanup Registry for Test Environment
 * @description Standardized cleanup system to prevent orphaned processes and handles
 * 根治路径是两层防线：测试内部严格 teardown，外部会话级一键回收
 */

type Cleanup = () => Promise<void> | void;

/**
 * Global cleanup registry - stores all cleanup functions
 */
const cleaners: Cleanup[] = [];

/**
 * Register a cleanup function to be executed during teardown
 * 所有外部资源创建处必须配套registerCleanup
 */
export const registerCleanup = (fn: Cleanup): void => {
  cleaners.push(fn);
};

/**
 * Execute all registered cleanup functions and clear the registry
 * Processes cleanups in LIFO order (last registered, first executed)
 * 按注册的反序执行（后进先出）
 */
export const runCleanups = async (): Promise<void> => {
  const errors: Error[] = [];
  
  // Process cleanups in reverse order (LIFO)
  while (cleaners.length > 0) {
    const cleanup = cleaners.pop();
    if (cleanup) {
      try {
        await cleanup();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
  
  // Report any cleanup errors but don't fail the test
  if (errors.length > 0) {
    console.warn(`⚠️  Cleanup warnings (${errors.length}):`, errors.map(e => e.message));
  }
};

/**
 * Clear all registered cleanups without executing them
 * Use this for test isolation when you don't want inherited cleanups
 */
export const clearCleanups = (): void => {
  cleaners.splice(0);
};

/**
 * Get count of registered cleanup functions
 */
export const getCleanupCount = (): number => cleaners.length;

/**
 * HTTP Server Cleanup Helper
 * Properly closes HTTP/HTTPS servers with timeout
 * 不要 app.listen 进行单元测试，使用 supertest(app)
 */
export const registerServerCleanup = (server: any): void => {
  registerCleanup(() => new Promise<void>((resolve) => {
    if (!server || !server.listening) {
      resolve();
      return;
    }
    
    const timeout = setTimeout(() => {
      console.warn('⚠️  Server cleanup timeout - forcing close');
      server.destroy?.();
      resolve();
    }, 5000);
    
    server.close(() => {
      clearTimeout(timeout);
      resolve();
    });
  }));
};

/**
 * Database Connection Cleanup Helper
 * Handles common database connection patterns
 */
export const registerDatabaseCleanup = (connection: any): void => {
  registerCleanup(async () => {
    try {
      // Prisma
      if (connection.$disconnect) {
        await connection.$disconnect();
        return;
      }
      
      // TypeORM DataSource
      if (connection.destroy) {
        await connection.destroy();
        return;
      }
      
      // MongoDB/Mongoose
      if (connection.close) {
        await connection.close();
        return;
      }
      
      // Generic pool
      if (connection.end) {
        await connection.end();
        return;
      }
      
      // Redis
      if (connection.quit) {
        await connection.quit();
        return;
      }
      
      console.warn('⚠️  Unknown database connection type for cleanup');
    } catch (error) {
      console.warn('⚠️  Database cleanup error:', error);
    }
  });
};

/**
 * Process Cleanup Helper - 子进程创建与杀树
 * Safely terminates child processes with timeout
 */
export const registerProcessCleanup = (process: any): void => {
  registerCleanup(async () => {
    if (!process || !process.pid) return;
    
    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.warn(`⚠️  Process ${process.pid} cleanup timeout - forcing kill`);
        try {
          process.kill('SIGKILL');
        } catch (e) {
          // Process might already be dead
        }
        resolve();
      }, 5000);
      
      process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      try {
        process.kill('SIGTERM');
      } catch (error) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
};

/**
 * Browser Cleanup Helper
 * Handles Playwright/Puppeteer browser instances
 */
export const registerBrowserCleanup = (browser: any, context?: any): void => {
  registerCleanup(async () => {
    try {
      if (context?.close) {
        await context.close();
      }
      if (browser?.close) {
        await browser.close();
      }
    } catch (error) {
      console.warn('⚠️  Browser cleanup error:', error);
    }
  });
};

/**
 * Timer Cleanup Helper - 恢复真实定时器
 * Clears intervals, timeouts, and restores fake timers
 */
export const registerTimerCleanup = (timers: NodeJS.Timeout[]): void => {
  registerCleanup(() => {
    timers.forEach(timer => {
      try {
        clearTimeout(timer);
        clearInterval(timer);
      } catch (e) {
        // Timer might already be cleared
      }
    });
    
    // Reset Jest fake timers if active
    if (global.jest && jest.useRealTimers) {
      jest.useRealTimers();
    }
  });
};

/**
 * File Watcher Cleanup Helper - fs.watch 与 chokidar 必须 close
 * Closes fs.watch and chokidar watchers
 */
export const registerWatcherCleanup = (watcher: any): void => {
  registerCleanup(async () => {
    try {
      if (watcher.close) {
        await watcher.close();
      } else if (watcher.unwatch) {
        watcher.unwatch();
      }
    } catch (error) {
      console.warn('⚠️  Watcher cleanup error:', error);
    }
  });
};

/**
 * AbortController Cleanup Helper - 为任何长 I/O 设上限
 * Aborts ongoing operations
 */
export const registerAbortCleanup = (controller: AbortController): void => {
  registerCleanup(() => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  });
};

/**
 * Queue/Worker Cleanup Helper - 禁用默认重连或在 teardown 前先 pause
 * Handles BullMQ, worker threads, etc.
 */
export const registerQueueCleanup = (queue: any): void => {
  registerCleanup(async () => {
    try {
      // Pause queue first to stop processing
      if (queue.pause) {
        await queue.pause();
      }
      
      // BullMQ
      if (queue.close) {
        await queue.close();
      }
      
      // Worker threads
      if (queue.terminate) {
        await queue.terminate();
      }
      
      // AMQP channel/connection
      if (queue.connection?.close) {
        await queue.connection.close();
      }
    } catch (error) {
      console.warn('⚠️  Queue cleanup error:', error);
    }
  });
};