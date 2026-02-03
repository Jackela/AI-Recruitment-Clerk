/**
 * Port Cleanup Utility (ES Module)
 * 
 * Ensures clean state between test runs by killing processes on test ports
 * This prevents connection issues caused by orphaned processes
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TEST_PORTS = [4202, 3000]; // Dev server and mock API ports

async function killProcessOnPort(port) {
  const isWindows = process.platform === 'win32';
  
  try {
    if (isWindows) {
      // Windows: Find and kill processes using the port
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        
        if (pid && pid !== '0') {
          try {
            await execAsync(`taskkill /PID ${pid} /F`);
            console.log(`✅ Killed process ${pid} on port ${port}`);
          } catch {
            // Process might already be dead
            console.log(`ℹ️ Process ${pid} on port ${port} already terminated`);
          }
        }
      }
    } else {
      // Unix-like systems
      try {
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        const pids = stdout.split('\n').filter(pid => pid.trim());
        
        for (const pid of pids) {
          await execAsync(`kill -9 ${pid}`);
          console.log(`✅ Killed process ${pid} on port ${port}`);
        }
      } catch {
        // No processes found on port
        console.log(`ℹ️ No processes found on port ${port}`);
      }
    }
  } catch {
    console.log(`ℹ️ No processes to kill on port ${port}`);
  }
}

export async function cleanup() {
  console.log('🧹 Cleaning up test ports...');
  
  for (const port of TEST_PORTS) {
    await killProcessOnPort(port);
  }
  
  // Add small delay to ensure ports are fully released
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('✅ Port cleanup completed');
}

export { killProcessOnPort };

// Allow running as script
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanup().catch(console.error);
}