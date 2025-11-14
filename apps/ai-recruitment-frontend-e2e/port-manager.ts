/**
 * Enhanced Port Management System for E2E Tests
 *
 * Provides dynamic port allocation, conflict detection, and robust cleanup
 * to prevent infrastructure failures in test environments.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';
import { getTestingEnvironment } from './testing-env';

const execAsync = promisify(exec);

interface PortStatus {
  port: number;
  isAvailable: boolean;
  processId?: string;
  processName?: string;
}

interface ServerConfig {
  name: string;
  defaultPort: number;
  fallbackPorts: number[];
  healthPath: string;
  maxRetries: number;
}

/**
 * Represents the port manager.
 */
export class PortManager {
  private static instance: PortManager;
  private allocatedPorts: Map<string, number> = new Map();
  private serverConfigs: Map<string, ServerConfig> = new Map();

  private constructor() {
    // Initialize server configurations
    this.serverConfigs.set('mock-api', {
      name: 'Mock API Server',
      defaultPort: 3001,
      fallbackPorts: [3002, 3003, 3004, 3005],
      healthPath: '/api/health',
      maxRetries: 3,
    });

    this.serverConfigs.set('dev-server', {
      name: 'Development Server',
      defaultPort: 4202,
      fallbackPorts: [4203, 4204, 4205, 4206],
      healthPath: '/',
      maxRetries: 3,
    });

    this.serverConfigs.set('gateway', {
      name: 'App Gateway',
      defaultPort: 3000,
      fallbackPorts: [3010, 3011, 3012, 3013],
      healthPath: '/api/auth/health',
      maxRetries: 3,
    });
  }

  private shouldSkipServiceCleanup(serviceName: string): boolean {
    const env = getTestingEnvironment();
    if (env.forcePortSweep) {
      return false;
    }

    if (
      serviceName === 'gateway' &&
      !env.useRealApi &&
      !env.forceGatewayCleanup
    ) {
      return true;
    }

    if (
      serviceName === 'dev-server' &&
      env.skipWebServer &&
      !env.forceDevServerCleanup
    ) {
      return true;
    }

    if (serviceName === 'mock-api' && env.useRealApi) {
      return true;
    }

    return false;
  }

  private getProtectedPorts(): Set<number> {
    const env = getTestingEnvironment();
    const ports = new Set<number>(env.protectedPorts);

    if (!env.useRealApi) {
      ports.add(3000);
    }

    if (env.skipWebServer) {
      ports.add(4200);
    }

    return ports;
  }

  private isProtectedProcess(name?: string): boolean {
    if (!name) {
      return false;
    }

    const normalized = name.toLowerCase();
    const protectedKeywords = [
      'com.docker',
      'docker',
      'vpnkit',
      'hyper-v',
      'vmmem',
      'vmwp',
      'wsl',
      'lxd',
      'containerd',
      'podman',
    ];

    return protectedKeywords.some((keyword) => normalized.includes(keyword));
  }

  private async getProcessNameByPid(pid: string): Promise<string | undefined> {
    if (!pid) {
      return undefined;
    }

    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(
          `tasklist /FI "PID eq ${pid}" /FO CSV /NH`,
        );
        return stdout.split(',')[0]?.replace(/"/g, '');
      }

      const { stdout } = await execAsync(`ps -p ${pid} -o comm=`);
      return stdout.trim();
    } catch {
      return undefined;
    }
  }

  /**
   * Retrieves instance.
   * @returns The PortManager.
   */
  static getInstance(): PortManager {
    if (!PortManager.instance) {
      PortManager.instance = new PortManager();
    }
    return PortManager.instance;
  }

  /**
   * Check if a port is available for use
   */
  async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });

      server.on('error', () => resolve(false));
    });
  }

  /**
   * Get detailed status of a port including process information
   */
  async getPortStatus(port: number): Promise<PortStatus> {
    const isAvailable = await this.isPortAvailable(port);
    const status: PortStatus = { port, isAvailable };

    if (!isAvailable) {
      try {
        const processInfo = await this.getProcessOnPort(port);
        status.processId = processInfo.pid;
        status.processName = processInfo.name;
      } catch (error) {
        // Process info not available
      }
    }

    return status;
  }

  /**
   * Get process information for a specific port
   */
  private async getProcessOnPort(
    port: number,
  ): Promise<{ pid: string; name: string }> {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.split('\n').filter((line) => line.trim());

      if (lines.length > 0) {
        const parts = lines[0].trim().split(/\s+/);
        const pid = parts[parts.length - 1];

        if (pid && pid !== '0') {
          try {
            const { stdout: taskOutput } = await execAsync(
              `tasklist /FI "PID eq ${pid}" /FO CSV /NH`,
            );
            const taskInfo = taskOutput.split(',')[0].replace(/"/g, '');
            return { pid, name: taskInfo };
          } catch {
            return { pid, name: 'Unknown' };
          }
        }
      }
    } else {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      const pid = stdout.trim().split('\n')[0];

      if (pid) {
        try {
          const { stdout: psOutput } = await execAsync(`ps -p ${pid} -o comm=`);
          return { pid, name: psOutput.trim() };
        } catch {
          return { pid, name: 'Unknown' };
        }
      }
    }

    throw new Error(`No process found on port ${port}`);
  }

  /**
   * Allocate an available port for a service
   */
  async allocatePort(serviceName: string): Promise<number> {
    const config = this.serverConfigs.get(serviceName);
    if (!config) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    // Check if already allocated
    const existingPort = this.allocatedPorts.get(serviceName);
    if (existingPort && (await this.isPortAvailable(existingPort))) {
      return existingPort;
    }

    // Try default port first
    const portsToTry = [config.defaultPort, ...config.fallbackPorts];

    for (const port of portsToTry) {
      const status = await this.getPortStatus(port);
      if (status.isAvailable) {
        this.allocatedPorts.set(serviceName, port);
        console.log(`✅ Allocated port ${port} for ${config.name}`);
        return port;
      } else {
        console.log(
          `⚠️ Port ${port} occupied by ${status.processName || 'unknown'} (PID: ${status.processId})`,
        );
      }
    }

    throw new Error(
      `No available ports found for ${config.name}. Tried: ${portsToTry.join(', ')}`,
    );
  }

  /**
   * Force kill process on a specific port with enhanced reliability
   */
  async forceKillPort(port: number): Promise<boolean> {
    const protectedPorts = this.getProtectedPorts();
    if (protectedPorts.has(port)) {
      console.log(
        `🛡️ Skipping force kill for protected port ${port} (external service)`,
      );
      return false;
    }

    const isWindows = process.platform === 'win32';
    let killedAny = false;

    try {
      if (isWindows) {
        // Multiple attempts for Windows reliability
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { stdout } = await execAsync(
              `netstat -ano | findstr :${port}`,
              { timeout: 10000 },
            );
            const lines = stdout.split('\n').filter((line) => line.trim());

            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              const pid = parts[parts.length - 1];

              if (pid && pid !== '0' && !isNaN(parseInt(pid))) {
                const processName = await this.getProcessNameByPid(pid);
                if (this.isProtectedProcess(processName)) {
                  console.log(
                    `🛡️ Skipping protected process ${processName} (PID ${pid}) on port ${port}`,
                  );
                  continue;
                }

                try {
                  await execAsync(`taskkill /PID ${pid} /F /T`, {
                    timeout: 10000,
                  });
                  console.log(
                    `🔪 Force killed Windows process ${pid} on port ${port} (attempt ${attempt + 1})`,
                  );
                  killedAny = true;
                } catch (killError) {
                  console.warn(
                    `⚠️ Failed to kill Windows process ${pid} on attempt ${attempt + 1}:`,
                    killError,
                  );
                }
              }
            }

            if (killedAny) break;
          } catch (netstatError) {
            if (attempt === 2) {
              console.log(
                `ℹ️ No process found on port ${port} after ${attempt + 1} attempts`,
              );
            }
          }

          // Brief wait between attempts
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } else {
        // Enhanced Unix/Linux/macOS handling
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { stdout } = await execAsync(`lsof -ti:${port}`, {
              timeout: 10000,
            });
            const pids = stdout
              .split('\n')
              .filter((pid) => pid.trim() && !isNaN(parseInt(pid)));

            for (const pid of pids) {
              const processName = await this.getProcessNameByPid(pid);
              if (this.isProtectedProcess(processName)) {
                console.log(
                  `🛡️ Skipping protected process ${processName} (PID ${pid}) on port ${port}`,
                );
                continue;
              }

              try {
                // Try graceful termination first
                await execAsync(`kill -TERM ${pid}`, { timeout: 5000 });
                await new Promise((resolve) => setTimeout(resolve, 2000));

                // Check if still running, then force kill
                try {
                  await execAsync(`kill -0 ${pid}`, { timeout: 2000 });
                  await execAsync(`kill -9 ${pid}`, { timeout: 5000 });
                  console.log(
                    `🔪 Force killed Unix process ${pid} on port ${port} (attempt ${attempt + 1})`,
                  );
                } catch {
                  console.log(
                    `✅ Process ${pid} terminated gracefully on port ${port}`,
                  );
                }
                killedAny = true;
              } catch (killError) {
                console.warn(
                  `⚠️ Failed to kill Unix process ${pid} on attempt ${attempt + 1}:`,
                  killError,
                );
              }
            }

            if (killedAny) break;
          } catch (lsofError) {
            if (attempt === 2) {
              console.log(
                `ℹ️ No process found on port ${port} after ${attempt + 1} attempts`,
              );
            }
          }

          // Brief wait between attempts
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      // Extended wait for port to be released
      if (killedAny) {
        const released = await this.waitForPortRelease(port, 10000);
        if (!released) {
          console.warn(
            `⚠️ Port ${port} not released within timeout after killing processes`,
          );
        }
      }

      return killedAny;
    } catch (error) {
      console.warn(`⚠️ Error during force kill on port ${port}:`, error);
      return false;
    }
  }

  /**
   * Wait for a port to be released
   */
  private async waitForPortRelease(
    port: number,
    timeoutMs: number = 10000,
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (await this.isPortAvailable(port)) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return false;
  }

  /**
   * Cleanup all allocated ports with enhanced reliability
   */
  async cleanupAllPorts(): Promise<void> {
    console.log('🧹 Starting comprehensive port cleanup...');

    const protectedPorts = this.getProtectedPorts();
    const allPorts = new Set<number>();

    // Collect all configured ports
    for (const [serviceName, config] of this.serverConfigs) {
      if (this.shouldSkipServiceCleanup(serviceName)) {
        continue;
      }
      allPorts.add(config.defaultPort);
      config.fallbackPorts.forEach((port) => allPorts.add(port));
    }

    // Add allocated ports
    for (const port of this.allocatedPorts.values()) {
      allPorts.add(port);
    }

    const envSnapshot = getTestingEnvironment();
    const activeDevServerPort = envSnapshot.devServerPort;

    // Sequential cleanup to prevent race conditions
    for (const port of Array.from(allPorts)) {
      if (Number.isFinite(activeDevServerPort) && port === activeDevServerPort) {
        console.log(
          `🛡️ Skipping cleanup for active dev server port ${port} (managed by Playwright)`,
        );
        continue;
      }

      if (protectedPorts.has(port)) {
        console.log(
          `🛡️ Skipping cleanup for protected port ${port} (external service)`,
        );
        continue;
      }

      try {
        const status = await this.getPortStatus(port);
        if (!status.isAvailable) {
          if (this.isProtectedProcess(status.processName)) {
            console.log(
              `🛡️ Skipping cleanup for port ${port} owned by protected process ${status.processName}`,
            );
            continue;
          }

          console.log(
            `🔄 Cleaning up port ${port} (${status.processName}, PID: ${status.processId})`,
          );
          await this.forceKillPort(port);

          // Verify port is actually released
          await this.waitForPortRelease(port, 5000);

          const verifyStatus = await this.getPortStatus(port);
          if (!verifyStatus.isAvailable) {
            console.warn(
              `⚠️ Port ${port} still occupied after cleanup attempt`,
            );
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error cleaning port ${port}:`, error);
      }
    }

    // Clear allocated ports map
    this.allocatedPorts.clear();

    // Extended wait for system to stabilize
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('✅ Port cleanup completed');
  }

  /**
   * Get allocated port for a service
   */
  getAllocatedPort(serviceName: string): number | undefined {
    return this.allocatedPorts.get(serviceName);
  }

  /**
   * Release port allocation for a service
   */
  releasePort(serviceName: string): void {
    const port = this.allocatedPorts.get(serviceName);
    if (port) {
      this.allocatedPorts.delete(serviceName);
      console.log(`🔓 Released port ${port} for ${serviceName}`);
    }
  }

  /**
   * Health check for allocated services
   */
  async healthCheckServices(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [serviceName, port] of this.allocatedPorts) {
      const config = this.serverConfigs.get(serviceName);
      if (config) {
        const url = `http://localhost:${port}${config.healthPath}`;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              Accept: 'application/json,text/html',
              'User-Agent': 'E2E-PortManager/1.0',
            },
          });

          clearTimeout(timeoutId);
          results.set(serviceName, response.ok);
        } catch {
          results.set(serviceName, false);
        }
      }
    }

    return results;
  }

  /**
   * Wait for service to be ready with retry mechanism
   */
  async waitForService(
    serviceName: string,
    timeoutMs: number = 30000,
  ): Promise<boolean> {
    const config = this.serverConfigs.get(serviceName);
    const port = this.allocatedPorts.get(serviceName);

    if (!config || !port) {
      throw new Error(
        `Service ${serviceName} not configured or port not allocated`,
      );
    }

    const url = `http://localhost:${port}${config.healthPath}`;
    const startTime = Date.now();
    let attempts = 0;

    while (Date.now() - startTime < timeoutMs) {
      try {
        attempts++;
        console.log(
          `⏳ Waiting for ${config.name} at ${url} (attempt ${attempts})`,
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            Accept: 'application/json,text/html',
            'User-Agent': 'E2E-PortManager/1.0',
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`✅ ${config.name} is ready after ${attempts} attempts`);
          return true;
        }
      } catch (error) {
        // Service not ready yet
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.error(
      `❌ ${config.name} failed to start within ${timeoutMs}ms (${attempts} attempts)`,
    );
    return false;
  }

  /**
   * Get comprehensive port report
   */
  async generatePortReport(): Promise<string> {
    const report = ['🔍 Port Status Report', '═'.repeat(50)];

    for (const [serviceName, config] of this.serverConfigs) {
      const allocatedPort = this.allocatedPorts.get(serviceName);
      const portsToCheck = [config.defaultPort, ...config.fallbackPorts];

      report.push(`\n📊 ${config.name}:`);
      report.push(`   Allocated: ${allocatedPort || 'None'}`);

      for (const port of portsToCheck) {
        const status = await this.getPortStatus(port);
        const indicator = status.isAvailable ? '🟢' : '🔴';
        const processInfo = status.processName
          ? ` (${status.processName}, PID: ${status.processId})`
          : '';
        report.push(`   ${indicator} ${port}${processInfo}`);
      }
    }

    return report.join('\n');
  }
}

// Singleton instance
export const portManager = PortManager.getInstance();
