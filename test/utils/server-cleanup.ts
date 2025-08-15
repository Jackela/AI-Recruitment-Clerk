// 服务器和HTTP测试清理工具
import { Server } from 'http';
import { registerCleanup } from './cleanup';

/**
 * 创建可清理的HTTP服务器
 * 不要使用 app.listen，使用此工具确保正确清理
 */
export const createTestServer = (app: any, port = 0): Promise<Server> => {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, (err?: Error) => {
      if (err) {
        reject(err);
        return;
      }
      
      // 注册清理函数
      registerCleanup(() => new Promise<void>((resolveClose) => {
        if (server.listening) {
          server.close(() => {
            resolveClose();
          });
        } else {
          resolveClose();
        }
      }));
      
      resolve(server);
    });
    
    // 处理服务器错误
    server.on('error', reject);
  });
};

/**
 * 获取服务器实际监听的端口
 */
export const getServerPort = (server: Server): number => {
  const address = server.address();
  if (typeof address === 'object' && address) {
    return address.port;
  }
  throw new Error('无法获取服务器端口');
};

/**
 * 等待服务器完全启动
 */
export const waitForServer = (server: Server, timeout = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (server.listening) {
      resolve();
      return;
    }
    
    const timeoutId = setTimeout(() => {
      reject(new Error(`服务器启动超时 (${timeout}ms)`));
    }, timeout);
    
    server.once('listening', () => {
      clearTimeout(timeoutId);
      resolve();
    });
    
    server.once('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
};