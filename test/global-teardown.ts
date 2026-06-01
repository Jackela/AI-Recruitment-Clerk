/**
 * @file Global Test Teardown - Enhanced Handle Detection
 * @description Detects orphaned handles and processes to ensure clean test exits
 * 全局teardown - 遗留句柄直接当失败，检测与红线
 */

const COMMON_TEST_PORTS = [3000, 3001, 4200, 4222, 6222, 8222, 27017, 6379];

/**
 * 杀掉占用指定端口的进程
 */
async function killPortProcesses(ports: number[]): Promise<void> {
  const { execSync } = require('child_process');

  for (const port of ports) {
    try {
      if (process.platform === 'win32') {
        // Windows: 查找并杀掉占用端口的进程
        const result = execSync(`netstat -ano | findstr :${port}`, {
          encoding: 'utf8',
          stdio: 'pipe',
        });
        if (result) {
          const lines = result
            .split('\n')
            .filter((line: string) => line.trim());
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(Number(pid))) {
              try {
                execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
              } catch {}
            }
          }
        }
      } else {
        // Unix/Linux/macOS: 使用 lsof
        execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
      }
    } catch {
      // 端口未被占用或清理失败，继续下一个端口
    }
  }
}

export default async (): Promise<void> => {
  console.log('🧹 执行全局清理检查...');

  try {
    // 清理可能的端口占用（仅在显式启用时）
    if (process.env['CLEANUP_PORTS'] === 'true') {
      await killPortProcesses(COMMON_TEST_PORTS);
    }

    // 检查活动句柄（延迟执行以允许清理完成）
    setTimeout(() => {
      const rawHandles = (process as any)._getActiveHandles?.() || [];
      const filterStandardHandle = (handle: any): boolean => {
        if (!handle) return false;
        if (handle.isTTY) return true;
        const fd = handle._handle?.fd ?? handle.fd;
        if (typeof fd === 'number' && (fd === 0 || fd === 1 || fd === 2)) {
          return true;
        }
        if (
          handle.constructor?.name === 'Pipe' &&
          typeof fd === 'number' &&
          fd <= 3
        ) {
          return true;
        }
        return false;
      };
      const activeHandles = rawHandles.filter(
        (handle: any) => !filterStandardHandle(handle),
      );
      const activeRequests = (process as any)._getActiveRequests?.() || [];

      if (activeHandles.length > 0 || activeRequests.length > 0) {
        console.error(`❌ 检测到遗留资源:`);
        console.error(`   活动句柄: ${activeHandles.length}`);
        console.error(`   活动请求: ${activeRequests.length}`);

        // 在开发环境中显示详细信息
        if (process.env['NODE_ENV'] !== 'production') {
          console.log('活动句柄详情:');
          activeHandles.forEach((handle: any, index: number) => {
            console.log(
              `  ${index + 1}. ${handle.constructor?.name || 'Unknown'}`,
            );
          });
        }

        // 如果启用了句柄检测，显示详细报告
        if (process.env['DETECT_HANDLES'] === 'true') {
          try {
            // 动态导入why-is-node-running（如果可用）
            const why = require('why-is-node-running');
            console.log('🔍 分析Node.js运行原因:');
            why();
          } catch (error) {
            console.log('💡 提示: 安装 why-is-node-running 以获取详细分析');
          }
        }
      } else {
        console.log('✅ 未检测到遗留资源');
      }

      // 检查Docker容器是否仍在运行
      if (process.env['CLEANUP_DOCKER'] === 'true') {
        const { spawn } = require('child_process');
        const dockerPs = spawn(
          'docker',
          ['ps', '--filter', 'name=ai-recruitment', '--quiet'],
          {
            stdio: 'pipe',
          },
        );

        dockerPs.stdout.on('data', (data: Buffer) => {
          const containerIds = data.toString().trim();
          if (containerIds) {
            console.warn(
              `⚠️  检测到运行中的测试容器: ${containerIds.split('\n').length} 个`,
            );
            console.log('💡 运行 docker-compose down 清理容器');
          }
        });
      }
    }, 200);
  } catch (error) {
    console.error('❌ 全局清理检查失败:', error);
  }

  console.log('🏁 全局清理检查完成');
};
