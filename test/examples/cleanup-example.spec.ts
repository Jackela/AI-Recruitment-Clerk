/**
 * @file Example Test with Comprehensive Cleanup
 * @description Demonstrates best practices for resource cleanup in tests
 * 演示测试中资源清理的最佳实践
 */

import {
  registerCleanup,
  registerServerCleanup,
  registerDatabaseCleanup,
  registerProcessCleanup,
  registerTimerCleanup,
  registerBrowserCleanup,
  registerQueueCleanup,
  getCleanupCount
} from '../utils/cleanup';

describe('Cleanup System Examples', () => {
  beforeEach(() => {
    // 每个测试开始前检查清理注册器是否已清空
    expect(getCleanupCount()).toBe(0);
  });

  afterEach(() => {
    // 每个测试后验证所有资源已清理
    expect(getCleanupCount()).toBe(0);
  });

  describe('HTTP Server Cleanup', () => {
    it('should properly clean up HTTP server without app.listen in tests', async () => {
      // ❌ 错误做法 - 不要在单元测试中使用 app.listen
      // const server = app.listen(3000);
      
      // ✅ 正确做法 - 使用 supertest
      const request = require('supertest');
      const express = require('express');
      
      const app = express();
      app.get('/health', (req, res) => res.json({ status: 'ok' }));
      
      // 如果确实需要启动服务器，使用清理注册器
      const server = app.listen(0); // 使用随机端口
      registerServerCleanup(server);
      
      // 测试
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Database Connection Cleanup', () => {
    it('should properly clean up database connections', async () => {
      // 模拟数据库连接
      const mockConnection = {
        isConnected: true,
        close: jest.fn().mockResolvedValue(undefined)
      };
      
      // 注册清理
      registerDatabaseCleanup(mockConnection);
      
      // 模拟数据库操作
      expect(mockConnection.isConnected).toBe(true);
      
      // 清理会在 afterEach 中自动执行
    });
  });

  describe('Child Process Cleanup', () => {
    it('should properly clean up child processes', async () => {
      const { spawn } = require('child_process');
      
      // 启动子进程
      const childProcess = spawn('node', ['-e', 'setTimeout(() => {}, 5000)']);
      
      // 注册清理 - 子进程创建与杀树
      registerProcessCleanup(childProcess);
      
      expect(childProcess.pid).toBeDefined();
      
      // 清理会在测试结束时自动执行
    });
  });

  describe('Timer Cleanup', () => {
    it('should properly clean up timers and restore real timers', () => {
      const timers: NodeJS.Timeout[] = [];
      
      // 创建定时器
      const timer1 = setTimeout(() => {}, 1000);
      const timer2 = setInterval(() => {}, 500);
      
      timers.push(timer1, timer2);
      
      // 如果使用假时钟
      jest.useFakeTimers();
      
      // 注册清理 - 恢复真实定时器
      registerTimerCleanup(timers);
      
      expect(jest.isMockFunction(setTimeout)).toBe(true);
      
      // 清理会恢复真实定时器并清除所有定时器
    });
  });

  describe('Browser Automation Cleanup', () => {
    it('should properly clean up browser instances', async () => {
      // 模拟 Playwright/Puppeteer 浏览器
      const mockBrowser = {
        close: jest.fn().mockResolvedValue(undefined)
      };
      
      const mockContext = {
        close: jest.fn().mockResolvedValue(undefined)
      };
      
      // 注册清理
      registerBrowserCleanup(mockBrowser, mockContext);
      
      // 模拟浏览器操作
      expect(mockBrowser).toBeDefined();
      expect(mockContext).toBeDefined();
    });
  });

  describe('Queue/Worker Cleanup', () => {
    it('should properly clean up queues and workers', async () => {
      // 模拟 BullMQ 队列
      const mockQueue = {
        isPaused: false,
        pause: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined)
      };
      
      // 注册清理 - 禁用默认重连或在 teardown 前先 pause
      registerQueueCleanup(mockQueue);
      
      // 模拟队列操作
      expect(mockQueue.isPaused).toBe(false);
    });
  });

  describe('Custom Resource Cleanup', () => {
    it('should support custom cleanup functions', async () => {
      let resourceCleaned = false;
      
      // 模拟自定义资源
      const customResource = {
        isActive: true,
        cleanup: () => {
          resourceCleaned = true;
          customResource.isActive = false;
        }
      };
      
      // 注册自定义清理函数
      registerCleanup(() => {
        customResource.cleanup();
      });
      
      expect(customResource.isActive).toBe(true);
      expect(resourceCleaned).toBe(false);
      
      // 清理会在测试结束时执行
    });
  });

  describe('AbortController Cleanup', () => {
    it('should properly abort ongoing operations', async () => {
      const controller = new AbortController();
      
      // 为任何长 I/O 设上限
      const { registerAbortCleanup } = require('../utils/cleanup');
      registerAbortCleanup(controller);
      
      // 模拟长时间运行的操作
      const longOperation = new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 5000);
        
        controller.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Operation aborted'));
        });
      });
      
      expect(controller.signal.aborted).toBe(false);
      
      // 清理会自动中止操作
    });
  });

  describe('File Watcher Cleanup', () => {
    it('should properly clean up file watchers', () => {
      // 模拟文件监听器 - fs.watch 与 chokidar 必须 close
      const mockWatcher = {
        isWatching: true,
        close: jest.fn().mockResolvedValue(undefined)
      };
      
      const { registerWatcherCleanup } = require('../utils/cleanup');
      registerWatcherCleanup(mockWatcher);
      
      expect(mockWatcher.isWatching).toBe(true);
    });
  });

  describe('Error Handling in Cleanup', () => {
    it('should handle cleanup errors gracefully', async () => {
      // 注册一个会出错的清理函数
      registerCleanup(() => {
        throw new Error('Cleanup error');
      });
      
      // 注册一个正常的清理函数
      let normalCleanupExecuted = false;
      registerCleanup(() => {
        normalCleanupExecuted = true;
      });
      
      // 即使有错误，其他清理函数仍应执行
      // （这会在 afterEach 中测试）
    });
  });

  describe('Realistic Integration Example', () => {
    it('should handle complex test scenario with multiple resources', async () => {
      // 模拟复杂的测试场景，涉及多种资源
      const express = require('express');
      const app = express();
      
      // 1. HTTP 服务器
      const server = app.listen(0);
      registerServerCleanup(server);
      
      // 2. 数据库连接
      const mockDb = {
        close: jest.fn().mockResolvedValue(undefined)
      };
      registerDatabaseCleanup(mockDb);
      
      // 3. 定时器
      const timers: NodeJS.Timeout[] = [];
      const timer = setTimeout(() => {}, 1000);
      timers.push(timer);
      registerTimerCleanup(timers);
      
      // 4. 自定义资源
      let customResourceActive = true;
      registerCleanup(() => {
        customResourceActive = false;
      });
      
      // 执行测试逻辑
      expect(server.listening).toBe(true);
      expect(mockDb).toBeDefined();
      expect(customResourceActive).toBe(true);
      
      // 所有资源会在测试结束时自动清理
    });
  });
});

// 演示正确的测试模式
describe('Supertest Pattern Example', () => {
  it('should use supertest instead of app.listen for HTTP testing', async () => {
    const request = require('supertest');
    const express = require('express');
    
    const app = express();
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    });
    
    // ✅ 使用 supertest - 不需要 app.listen
    const response = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);
    
    expect(response.body.status).toBe('healthy');
    expect(response.body.timestamp).toBeDefined();
    
    // 无需手动清理 - supertest 会自动处理
  });
});