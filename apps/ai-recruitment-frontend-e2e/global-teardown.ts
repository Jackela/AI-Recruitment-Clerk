import { stopMockServer } from './mock-server';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function globalTeardown() {
  const useRealAPI = process.env.E2E_USE_REAL_API === 'true';
  const e2eDir = __dirname;
  const pidFile = path.join(e2eDir, '.gateway.pid');

  if (!useRealAPI) {
    console.log('🛑 Stopping Mock API Server...');
    stopMockServer();
    console.log('✅ Mock API Server stopped successfully');
  }
  // Stop real gateway if we started it
  if (useRealAPI) {
    try {
      if (fs.existsSync(pidFile)) {
        const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);
        if (!isNaN(pid)) {
          console.log(`🛑 Stopping App Gateway (pid ${pid})...`);
          if (process.platform === 'win32') {
            spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
              stdio: 'ignore',
              shell: true,
            });
          } else {
            try {
              process.kill(pid);
            } catch (e) {
              // ignore
            }
          }
        }
        fs.rmSync(pidFile, { force: true });
      }
    } catch (err) {
      console.warn('⚠️ Failed to stop App Gateway:', (err as Error).message);
    }
  }

  // Fix: Clean up ports to prevent connection issues in subsequent runs
  try {
    const { cleanup } = await import('./cleanup-ports.mjs');
    await cleanup();
  } catch (error) {
    console.warn('⚠️ Port cleanup failed:', (error as Error).message);
  }
}

export default globalTeardown;
