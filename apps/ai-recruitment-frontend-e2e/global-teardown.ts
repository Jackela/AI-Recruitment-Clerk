import { stopMockServer, getMockServerStatus } from './mock-server.js';
import { portManager } from './port-manager.js';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function globalTeardown() {
  console.log('🛑 Starting E2E test environment teardown...');
  
  // Set up timeout for the entire teardown process
  const teardownTimeout = setTimeout(() => {
    console.warn('⚠️ Teardown taking too long, forcing exit in 5 seconds...');
    setTimeout(() => {
      console.error('❌ Teardown timeout exceeded, forcing process exit');
      process.exit(0);
    }, 5000);
  }, 30000); // 30 second timeout for teardown
  
  try {
    const useRealAPI = process.env.E2E_USE_REAL_API === 'true';
    const e2eDir = __dirname;
    const pidFile = path.join(e2eDir, '.gateway.pid');

  if (!useRealAPI) {
    console.log('🛑 Stopping Enhanced Mock API Server...');
    try {
      await stopMockServer();
      console.log('✅ Mock API Server stopped successfully');
    } catch (error) {
      console.warn('⚠️ Error stopping mock server:', error);
    }
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

    // Enhanced port cleanup with comprehensive management
    try {
      console.log('🧹 Performing comprehensive port cleanup...');
      
      // Check if mock server is still running and force close connections
      const mockStatus = getMockServerStatus();
      if (mockStatus.running) {
        console.log('🔌 Force closing any remaining mock server connections...');
        try {
          // Stop accepting new connections and close existing ones
          await stopMockServer();
          // Wait for graceful shutdown
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) {
          console.warn('⚠️ Error during final mock server shutdown:', e);
        }
      }
      
      // Give connections more time to close
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await portManager.cleanupAllPorts();
      
      // Generate final port report for verification
      try {
        const finalReport = await portManager.generatePortReport();
        console.log('📊 Final port status:', finalReport);
      } catch (reportError) {
        console.warn('⚠️ Could not generate final port report:', reportError);
      }
      
      console.log('✅ Enhanced port cleanup completed successfully');
    } catch (error) {
      console.warn('⚠️ Enhanced port cleanup failed:', (error as Error).message);
      
      // Fallback to robust cleanup system
      try {
        console.log('🔨 Attempting robust emergency cleanup...');
        const { emergencyCleanup } = await import('./robust-cleanup.js');
        await emergencyCleanup();
        console.log('✅ Emergency cleanup completed');
      } catch (robustError) {
        console.error('❌ Emergency cleanup failed:', (robustError as Error).message);
        
        // Final fallback - try legacy cleanup if available
        try {
          console.log('🔄 Attempting legacy port cleanup fallback...');
          const { cleanup } = await import('./cleanup-ports.mjs');
          await cleanup();
          console.log('✅ Legacy port cleanup completed');
        } catch (fallbackError) {
          console.error('❌ All cleanup methods failed:', (fallbackError as Error).message);
          console.log('🏁 Manual cleanup may be required for some ports');
        }
      }
    }
    
    console.log('✅ E2E test environment teardown completed');
  } finally {
    // Clear the timeout
    clearTimeout(teardownTimeout);
  }
}

export default globalTeardown;
