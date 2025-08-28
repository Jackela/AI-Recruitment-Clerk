// 进程和子进程清理工具
import { spawn, ChildProcess } from 'child_process';
import { registerCleanup } from './cleanup';

/**
 * 启动可清理的子进程
 */
export const startCleanableProcess = (command: string, args: string[] = [], options: any = {}): ChildProcess => {
  const childProcess = spawn(command, args, {
    stdio: 'pipe',
    detached: false, // 确保子进程会随父进程退出
    ...options
  });
  
  // 注册清理函数
  registerCleanup(async () => {
    if (childProcess && !childProcess.killed) {
      return new Promise<void>((resolve) => {
        // 尝试优雅关闭
        childProcess.kill('SIGTERM');
        
        // 如果5秒后还没退出，强制杀死
        const forceKillTimeout = setTimeout(() => {
          if (!childProcess.killed) {
            childProcess.kill('SIGKILL');
          }
        }, 5000);
        
        childProcess.on('exit', () => {
          clearTimeout(forceKillTimeout);
          resolve();
        });
        
        childProcess.on('error', () => {
          clearTimeout(forceKillTimeout);
          resolve();
        });
      });
    }
  });
  
  return childProcess;
};

/**
 * 杀死进程树（包括所有子进程）
 */
export const killProcessTree = async (pid: number, signal: string = 'SIGTERM'): Promise<void> => {
  return new Promise((resolve) => {
    try {
      // 在Windows上使用taskkill，在Unix系统上使用kill
      if (process.platform === 'win32') {
        const killProcess = spawn('taskkill', ['/pid', pid.toString(), '/t', '/f'], {
          stdio: 'ignore'
        });
        killProcess.on('exit', () => resolve());
        killProcess.on('error', () => resolve());
      } else {
        // Unix系统上杀死进程组
        try {
          process.kill(-pid, signal);
        } catch (error) {
          // 忽略错误，进程可能已经退出
        }
        resolve();
      }
    } catch (error) {
      // 忽略错误，继续清理
      resolve();
    }
  });
};

/**
 * 清理端口占用
 */
export const killPortProcesses = async (ports: number[]): Promise<void> => {
  if (ports.length === 0) return;
  
  for (const port of ports) {
    try {
      if (process.platform === 'win32') {
        // Windows上查找并杀死占用端口的进程
        const netstatProcess = spawn('netstat', ['-ano'], { stdio: 'pipe' });
        const findstrProcess = spawn('findstr', [`:${port}`], { stdio: 'pipe' });
        
        netstatProcess.stdout.pipe(findstrProcess.stdin);
        
        findstrProcess.stdout.on('data', (data) => {
          const lines = data.toString().split('\n');
          lines.forEach((line: string) => {
            const match = line.trim().match(/\s+(\d+)$/);
            if (match) {
              const pid = parseInt(match[1]);
              if (pid > 0) {
                try {
                  process.kill(pid, 'SIGTERM');
                } catch (error) {
                  // 忽略错误
                }
              }
            }
          });
        });
      } else {
        // Unix系统上使用lsof
        const lsofProcess = spawn('lsof', ['-ti', `:${port}`], { stdio: 'pipe' });
        
        lsofProcess.stdout.on('data', (data) => {
          const pids = data.toString().trim().split('\n');
          pids.forEach((pidStr: string) => {
            const pid = parseInt(pidStr.trim());
            if (pid > 0) {
              try {
                process.kill(pid, 'SIGTERM');
              } catch (error) {
                // 忽略错误
              }
            }
          });
        });
      }
    } catch (error) {
      // 忽略错误，继续清理其他端口
    }
  }
  
  // 等待一段时间让进程退出
  await new Promise(resolve => setTimeout(resolve, 1000));
};