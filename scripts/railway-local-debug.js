#!/usr/bin/env node

/**
 * Railway本地调试脚本 - Railway Local Debug Script
 * 用于在本地环境中使用Railway环境变量进行调试
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  railwayCommand: 'railway',
  defaultPort: 3000,
  healthCheckPath: '/api/health',
  maxRetries: 30,
  retryDelay: 2000
};

// 日志工具
const logger = {
  info: (msg) => console.log(`🔍 [DEBUG] ${msg}`),
  success: (msg) => console.log(`✅ [SUCCESS] ${msg}`),
  error: (msg) => console.error(`❌ [ERROR] ${msg}`),
  warn: (msg) => console.warn(`⚠️  [WARN] ${msg}`)
};

// 检查Railway CLI是否可用
function checkRailwayCLI() {
  return new Promise((resolve) => {
    exec(`${CONFIG.railwayCommand} --version`, (error) => {
      if (error) {
        logger.error('Railway CLI不可用。请先安装Railway CLI:');
        logger.info('npm install -g @railway/cli');
        logger.info('或访问: https://railway.app/cli');
        resolve(false);
      } else {
        logger.success('Railway CLI已安装');
        resolve(true);
      }
    });
  });
}

// 检查Railway项目链接状态
function checkRailwayProject() {
  return new Promise((resolve) => {
    exec(`${CONFIG.railwayCommand} status`, (error, stdout) => {
      if (error) {
        logger.error('未链接到Railway项目。请运行:');
        logger.info('railway link');
        resolve(false);
      } else {
        logger.success('Railway项目已链接');
        logger.info(stdout.trim());
        resolve(true);
      }
    });
  });
}

// 获取Railway环境变量
function getRailwayVariables() {
  return new Promise((resolve, reject) => {
    exec(`${CONFIG.railwayCommand} variables`, (error, stdout) => {
      if (error) {
        logger.error('无法获取Railway环境变量');
        reject(error);
      } else {
        logger.success('成功获取Railway环境变量');
        resolve(stdout);
      }
    });
  });
}

// 检查端口是否可用
function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const { createServer } = require('http');
    const server = createServer();
    
    server.listen(port, () => {
      server.close(() => {
        resolve(true);
      });
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

// 查找可用端口
async function findAvailablePort(startPort = CONFIG.defaultPort) {
  // 首先尝试清理可能占用的端口
  await cleanupPorts([startPort, startPort + 1, startPort + 2]);
  
  for (let port = startPort; port < startPort + 100; port++) {
    if (await checkPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('无法找到可用端口');
}

// 清理端口占用
async function cleanupPorts(ports) {
  for (const port of ports) {
    try {
      logger.info(`清理端口 ${port}...`);
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        await new Promise((resolve) => {
          exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
            if (stdout) {
              const lines = stdout.split('\n');
              lines.forEach(line => {
                const match = line.match(/\s+(\d+)$/);
                if (match) {
                  const pid = match[1];
                  exec(`taskkill /PID ${pid} /F`, (killError) => {
                    if (!killError) {
                      logger.info(`已清理进程 PID ${pid}`);
                    }
                  });
                }
              });
            }
            resolve();
          });
        });
      }
    } catch (error) {
      logger.warn(`清理端口 ${port} 失败: ${error.message}`);
    }
  }
  
  // 等待端口释放
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// 启动应用服务
function startApplication(command, port) {
  return new Promise((resolve, reject) => {
    logger.info(`启动应用: ${command}`);
    logger.info(`使用端口: ${port}`);
    
    const env = { ...process.env, PORT: port.toString() };
    const [cmd, ...args] = command.split(' ');
    
    const child = spawn(cmd, args, {
      env,
      stdio: 'pipe',
      shell: true
    });
    
    let started = false;
    
    child.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      
      // 检测启动成功的信号
      if (output.includes('启动成功') || output.includes('listening') || output.includes('Server running')) {
        if (!started) {
          started = true;
          resolve({ process: child, port });
        }
      }
    });
    
    child.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    child.on('error', (error) => {
      if (!started) {
        reject(error);
      }
    });
    
    child.on('exit', (code) => {
      if (!started && code !== 0) {
        reject(new Error(`应用启动失败，退出码: ${code}`));
      }
    });
    
    // 超时处理
    setTimeout(() => {
      if (!started) {
        child.kill();
        reject(new Error('应用启动超时'));
      }
    }, 30000);
  });
}

// 健康检查
async function healthCheck(port, retries = CONFIG.maxRetries) {
  const http = require('http');
  
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}${CONFIG.healthCheckPath}`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              logger.success(`健康检查通过 (尝试 ${i + 1}/${retries})`);
              try {
                const healthData = JSON.parse(data);
                logger.info(`服务状态: ${JSON.stringify(healthData, null, 2)}`);
              } catch (e) {
                logger.info(`响应数据: ${data}`);
              }
              resolve();
            } else {
              reject(new Error(`健康检查失败: HTTP ${res.statusCode}`));
            }
          });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('健康检查超时'));
        });
      });
      
      return true;
    } catch (error) {
      logger.warn(`健康检查失败 (尝试 ${i + 1}/${retries}): ${error.message}`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      }
    }
  }
  
  return false;
}

// 交互式调试菜单
function showDebugMenu(appProcess, port) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  function showMenu() {
    console.log('\n🔧 Railway本地调试菜单:');
    console.log('1. 健康检查');
    console.log('2. 查看环境变量');
    console.log('3. 测试API端点');
    console.log('4. 查看应用日志');
    console.log('5. 重启应用');
    console.log('6. 退出调试');
    console.log('');
  }
  
  function handleInput() {
    rl.question('请选择操作 (1-6): ', async (answer) => {
      switch (answer.trim()) {
        case '1':
          logger.info('执行健康检查...');
          const healthy = await healthCheck(port, 3);
          if (!healthy) {
            logger.error('健康检查失败');
          }
          break;
          
        case '2':
          logger.info('Railway环境变量:');
          try {
            const vars = await getRailwayVariables();
            console.log(vars);
          } catch (error) {
            logger.error('获取环境变量失败');
          }
          break;
          
        case '3':
          await testApiEndpoints(port);
          break;
          
        case '4':
          logger.info('应用日志将显示在上方');
          break;
          
        case '5':
          logger.info('重启功能暂未实现');
          break;
          
        case '6':
          logger.info('退出调试...');
          if (appProcess && !appProcess.killed) {
            appProcess.kill();
          }
          rl.close();
          process.exit(0);
          return;
          
        default:
          logger.warn('无效选项，请重新选择');
      }
      
      setTimeout(() => {
        showMenu();
        handleInput();
      }, 1000);
    });
  }
  
  showMenu();
  handleInput();
}

// 测试API端点
async function testApiEndpoints(port) {
  const endpoints = [
    '/api/health',
    '/api/marketing/feedback-codes/stats',
    '/'
  ];
  
  const http = require('http');
  
  for (const endpoint of endpoints) {
    try {
      logger.info(`测试端点: ${endpoint}`);
      
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}${endpoint}`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            logger.success(`${endpoint}: HTTP ${res.statusCode}`);
            if (res.statusCode === 200 && data) {
              try {
                const jsonData = JSON.parse(data);
                console.log('  响应:', JSON.stringify(jsonData, null, 2));
              } catch (e) {
                console.log('  响应长度:', data.length, '字符');
              }
            }
            resolve();
          });
        });
        
        req.on('error', (error) => {
          logger.error(`${endpoint}: ${error.message}`);
          resolve();
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          logger.error(`${endpoint}: 超时`);
          resolve();
        });
      });
    } catch (error) {
      logger.error(`测试${endpoint}失败: ${error.message}`);
    }
  }
}

// 主函数
async function main() {
  try {
    logger.info('🚀 Railway本地调试启动...');
    
    // 检查Railway CLI
    if (!(await checkRailwayCLI())) {
      process.exit(1);
    }
    
    // 检查项目链接
    if (!(await checkRailwayProject())) {
      process.exit(1);
    }
    
    // 获取环境变量信息
    try {
      await getRailwayVariables();
    } catch (error) {
      logger.warn('获取环境变量失败，但继续执行');
    }
    
    // 查找可用端口
    const port = await findAvailablePort();
    logger.success(`找到可用端口: ${port}`);
    
    // 启动应用
    const startCommand = 'railway run npm start';
    logger.info('启动应用服务...');
    
    let appProcess;
    try {
      const result = await startApplication(startCommand, port);
      appProcess = result.process;
      
      logger.success('应用启动成功！');
      
      // 等待应用完全启动
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 执行健康检查
      const healthy = await healthCheck(port);
      if (!healthy) {
        logger.warn('健康检查失败，但应用可能仍在启动中');
      }
      
      logger.success('🎉 Railway本地调试环境就绪！');
      logger.info(`应用地址: http://localhost:${port}`);
      logger.info(`健康检查: http://localhost:${port}/api/health`);
      
      // 显示调试菜单
      showDebugMenu(appProcess, port);
      
    } catch (error) {
      logger.error(`应用启动失败: ${error.message}`);
      logger.info('尝试使用simple-server fallback...');
      
      // Fallback到simple-server
      try {
        const fallbackCommand = `node simple-server.js`;
        const result = await startApplication(fallbackCommand, port);
        appProcess = result.process;
        
        logger.success('Fallback服务启动成功！');
        
        // 健康检查
        await new Promise(resolve => setTimeout(resolve, 2000));
        await healthCheck(port, 5);
        
        logger.success('🎉 Railway本地调试环境就绪 (Fallback模式)！');
        logger.info(`应用地址: http://localhost:${port}`);
        
        showDebugMenu(appProcess, port);
        
      } catch (fallbackError) {
        logger.error(`Fallback服务启动失败: ${fallbackError.message}`);
        process.exit(1);
      }
    }
    
  } catch (error) {
    logger.error(`调试脚本执行失败: ${error.message}`);
    process.exit(1);
  }
}

// 异常处理
process.on('uncaughtException', (error) => {
  logger.error(`未捕获异常: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`未处理的Promise拒绝: ${reason}`);
  process.exit(1);
});

// 启动脚本
if (require.main === module) {
  main();
}

module.exports = { main, healthCheck, testApiEndpoints };