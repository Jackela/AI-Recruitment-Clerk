/**
 * Robust Cleanup Utility
 *
 * Comprehensive cleanup system for E2E test infrastructure that handles
 * port conflicts, process cleanup, and resource management failures.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { portManager } from './port-manager';

const execAsync = promisify(exec);

interface CleanupOptions {
  forceKill?: boolean;
  retryAttempts?: number;
  waitTime?: number;
  targetPorts?: number[];
}

/**
 * Represents the robust cleanup.
 */
export class RobustCleanup {
  private static readonly DEFAULT_PORTS = [
    3000, 3001, 3002, 3003, 3004, 4202, 4203, 4204, 4205,
  ];

  /**
   * Execute comprehensive cleanup with multiple fallback strategies
   */
  static async executeCleanup(options: CleanupOptions = {}): Promise<void> {
    const {
      forceKill = false,
      retryAttempts = 3,
      waitTime = 2000,
      targetPorts = RobustCleanup.DEFAULT_PORTS,
    } = options;

    console.log('🚀 Starting robust cleanup process...');

    // Phase 1: Graceful port manager cleanup
    await RobustCleanup.phaseGracefulCleanup();

    // Phase 2: Targeted port cleanup
    await RobustCleanup.phaseTargetedCleanup(targetPorts, retryAttempts);

    // Phase 3: Force cleanup if requested
    if (forceKill) {
      await RobustCleanup.phaseForceCleanup(targetPorts);
    }

    // Phase 4: System stabilization
    await RobustCleanup.phaseStabilization(waitTime);

    // Phase 5: Verification
    await RobustCleanup.phaseVerification(targetPorts);

    console.log('✅ Robust cleanup process completed');
  }

  /**
   * Phase 1: Graceful cleanup using port manager
   */
  private static async phaseGracefulCleanup(): Promise<void> {
    console.log('📋 Phase 1: Graceful cleanup...');

    try {
      await portManager.cleanupAllPorts();
      console.log('✅ Port manager cleanup successful');
    } catch (error) {
      console.warn('⚠️ Port manager cleanup failed:', error);
    }
  }

  /**
   * Phase 2: Targeted port cleanup with retries
   */
  private static async phaseTargetedCleanup(
    ports: number[],
    maxRetries: number,
  ): Promise<void> {
    console.log(`📋 Phase 2: Targeted cleanup of ${ports.length} ports...`);

    for (const port of ports) {
      let attempts = 0;

      while (attempts < maxRetries) {
        try {
          const success = await portManager.forceKillPort(port);
          if (success) {
            console.log(`✅ Port ${port} cleaned successfully`);
            break;
          }
        } catch (error) {
          console.warn(
            `⚠️ Attempt ${attempts + 1} failed for port ${port}:`,
            error,
          );
        }

        attempts++;
        if (attempts < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (attempts >= maxRetries) {
        console.warn(
          `⚠️ Failed to clean port ${port} after ${maxRetries} attempts`,
        );
      }
    }
  }

  /**
   * Phase 3: Force cleanup using system commands
   */
  private static async phaseForceCleanup(ports: number[]): Promise<void> {
    console.log('📋 Phase 3: Force cleanup using system commands...');

    const isWindows = process.platform === 'win32';

    for (const port of ports) {
      try {
        if (isWindows) {
          // Windows force cleanup
          await RobustCleanup.windowsForceCleanup(port);
        } else {
          // Unix-like force cleanup
          await RobustCleanup.unixForceCleanup(port);
        }
      } catch (error) {
        console.warn(`⚠️ Force cleanup failed for port ${port}:`, error);
      }
    }
  }

  /**
   * Windows-specific force cleanup
   */
  private static async windowsForceCleanup(port: number): Promise<void> {
    try {
      // Find processes using the port
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`, {
        timeout: 5000,
      });
      const lines = stdout.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];

        if (pid && pid !== '0' && !isNaN(parseInt(pid))) {
          try {
            await execAsync(`taskkill /PID ${pid} /F /T`, { timeout: 5000 });
            console.log(
              `🔪 Force killed Windows process ${pid} on port ${port}`,
            );
          } catch (killError) {
            console.warn(
              `⚠️ Failed to kill Windows process ${pid}:`,
              killError,
            );
          }
        }
      }
    } catch (error) {
      // No processes found or command failed
    }
  }

  /**
   * Unix-like force cleanup
   */
  private static async unixForceCleanup(port: number): Promise<void> {
    try {
      // Find processes using the port
      const { stdout } = await execAsync(`lsof -ti:${port}`, { timeout: 5000 });
      const pids = stdout
        .split('\n')
        .filter((pid) => pid.trim() && !isNaN(parseInt(pid)));

      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid}`, { timeout: 5000 });
          console.log(`🔪 Force killed Unix process ${pid} on port ${port}`);
        } catch (killError) {
          console.warn(`⚠️ Failed to kill Unix process ${pid}:`, killError);
        }
      }
    } catch (error) {
      // No processes found or command failed
    }
  }

  /**
   * Phase 4: System stabilization
   */
  private static async phaseStabilization(waitTime: number): Promise<void> {
    console.log(`📋 Phase 4: System stabilization (${waitTime}ms)...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  /**
   * Phase 5: Verification
   */
  private static async phaseVerification(ports: number[]): Promise<void> {
    console.log('📋 Phase 5: Verification...');

    const issues: string[] = [];

    for (const port of ports) {
      try {
        const isAvailable = await portManager.isPortAvailable(port);
        if (!isAvailable) {
          const status = await portManager.getPortStatus(port);
          issues.push(
            `Port ${port} still occupied by ${status.processName} (PID: ${status.processId})`,
          );
        }
      } catch (error) {
        issues.push(`Failed to verify port ${port}: ${error}`);
      }
    }

    if (issues.length > 0) {
      console.warn('⚠️ Verification found issues:');
      issues.forEach((issue) => console.warn(`   - ${issue}`));
    } else {
      console.log('✅ All ports verified as available');
    }

    // Generate final report
    try {
      const report = await portManager.generatePortReport();
      console.log('📊 Final port status report:\n' + report);
    } catch (error) {
      console.warn('⚠️ Could not generate final report:', error);
    }
  }

  /**
   * Quick cleanup for immediate use
   */
  static async quickCleanup(): Promise<void> {
    console.log('⚡ Executing quick cleanup...');

    await RobustCleanup.executeCleanup({
      forceKill: false,
      retryAttempts: 1,
      waitTime: 1000,
    });
  }

  /**
   * Emergency cleanup with maximum force
   */
  static async emergencyCleanup(): Promise<void> {
    console.log('🚨 Executing emergency cleanup...');

    await RobustCleanup.executeCleanup({
      forceKill: true,
      retryAttempts: 5,
      waitTime: 3000,
    });
  }
}

// Export convenience functions
export const quickCleanup = RobustCleanup.quickCleanup;
export const emergencyCleanup = RobustCleanup.emergencyCleanup;
export const executeCleanup = RobustCleanup.executeCleanup;
