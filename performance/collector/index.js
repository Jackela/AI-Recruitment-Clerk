// AI Recruitment Clerk - Performance Metrics Collector
// Collects system metrics during load testing for comprehensive analysis

const express = require('express');
const Docker = require('dockerode');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

// Configuration
const CONFIG = {
  port: process.env.PORT || 3001,
  collectInterval: parseInt(process.env.COLLECT_INTERVAL) || 5,
  metricsOutput: process.env.METRICS_OUTPUT || '/results/system-metrics.json',
  monitorContainers: (process.env.MONITOR_CONTAINERS || '').split(',').filter(Boolean),
  retentionDays: 7,
};

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: '/results/collector.log' }),
  ],
});

// Docker client
const docker = new Docker({
  socketPath: '/var/run/docker.sock'
});

// Express app
const app = express();

// Metrics storage
let metricsHistory = [];
const MAX_HISTORY_POINTS = 10000;

// Performance metrics collector class
class PerformanceCollector {
  constructor() {
    this.isCollecting = false;
    this.collectionStartTime = null;
    this.collectionStats = {
      totalCollections: 0,
      errors: 0,
      lastCollection: null,
    };
  }

  async startCollection() {
    if (this.isCollecting) {
      logger.warn('Collection already in progress');
      return;
    }

    this.isCollecting = true;
    this.collectionStartTime = new Date();
    logger.info('Starting performance metrics collection', CONFIG);

    // Schedule metrics collection
    const cronExpression = `*/${CONFIG.collectInterval} * * * * *`;
    
    cron.schedule(cronExpression, async () => {
      if (this.isCollecting) {
        await this.collectMetrics();
      }
    });

    logger.info(`Metrics collection scheduled every ${CONFIG.collectInterval} seconds`);
  }

  async stopCollection() {
    this.isCollecting = false;
    logger.info('Stopping performance metrics collection');
    
    // Save final metrics report
    await this.saveFinalReport();
  }

  async collectMetrics() {
    try {
      const timestamp = new Date().toISOString();
      const metrics = {
        timestamp,
        system: await this.getSystemMetrics(),
        containers: await this.getContainerMetrics(),
        docker: await this.getDockerMetrics(),
        network: await this.getNetworkMetrics(),
      };

      // Add to history
      metricsHistory.push(metrics);
      
      // Limit history size
      if (metricsHistory.length > MAX_HISTORY_POINTS) {
        metricsHistory = metricsHistory.slice(-MAX_HISTORY_POINTS);
      }

      // Update stats
      this.collectionStats.totalCollections++;
      this.collectionStats.lastCollection = timestamp;

      // Save current metrics
      await this.saveMetrics(metrics);

      logger.debug(`Metrics collected at ${timestamp}`);
    } catch (error) {
      this.collectionStats.errors++;
      logger.error('Error collecting metrics:', error.message);
    }
  }

  async getSystemMetrics() {
    try {
      // Get system load, memory, CPU usage
      const { spawn } = require('child_process');
      
      return {
        loadAverage: await this.executeCommand('cat /proc/loadavg'),
        memoryInfo: await this.getMemoryInfo(),
        cpuInfo: await this.getCpuInfo(),
        diskInfo: await this.getDiskInfo(),
      };
    } catch (error) {
      logger.error('Error getting system metrics:', error.message);
      return {};
    }
  }

  async getContainerMetrics() {
    const containerMetrics = {};

    try {
      const containers = await docker.listContainers({ all: false });
      
      for (const containerInfo of containers) {
        const containerName = containerInfo.Names[0].replace('/', '');
        
        // Skip if not in monitor list (if specified)
        if (CONFIG.monitorContainers.length > 0 && 
            !CONFIG.monitorContainers.some(name => containerName.includes(name))) {
          continue;
        }

        try {
          const container = docker.getContainer(containerInfo.Id);
          const stats = await container.stats({ stream: false });
          
          containerMetrics[containerName] = {
            id: containerInfo.Id.substring(0, 12),
            image: containerInfo.Image,
            state: containerInfo.State,
            status: containerInfo.Status,
            created: containerInfo.Created,
            metrics: await this.processContainerStats(stats),
          };
        } catch (error) {
          logger.error(`Error getting stats for container ${containerName}:`, error.message);
        }
      }
    } catch (error) {
      logger.error('Error getting container metrics:', error.message);
    }

    return containerMetrics;
  }

  async processContainerStats(stats) {
    // Calculate CPU usage percentage
    const cpuUsage = this.calculateCpuUsage(stats);
    
    // Calculate memory usage
    const memoryUsage = {
      used: stats.memory_stats.usage || 0,
      limit: stats.memory_stats.limit || 0,
      percentage: stats.memory_stats.limit > 0 
        ? ((stats.memory_stats.usage || 0) / stats.memory_stats.limit) * 100 
        : 0,
    };

    // Calculate network I/O
    const networkIO = this.calculateNetworkIO(stats);

    // Calculate block I/O
    const blockIO = this.calculateBlockIO(stats);

    return {
      cpu: {
        usage: cpuUsage,
        systemUsage: stats.cpu_stats.system_cpu_usage,
        onlineCpus: stats.cpu_stats.online_cpus,
      },
      memory: memoryUsage,
      network: networkIO,
      block: blockIO,
      pids: stats.pids_stats,
    };
  }

  calculateCpuUsage(stats) {
    // Docker CPU usage calculation
    const cpuDelta = (stats.cpu_stats.cpu_usage?.total_usage || 0) - 
                     (stats.precpu_stats.cpu_usage?.total_usage || 0);
    const systemDelta = (stats.cpu_stats.system_cpu_usage || 0) - 
                        (stats.precpu_stats.system_cpu_usage || 0);
    
    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * (stats.cpu_stats.online_cpus || 1) * 100;
    }
    return 0;
  }

  calculateNetworkIO(stats) {
    const networks = stats.networks || {};
    let totalRx = 0;
    let totalTx = 0;

    Object.values(networks).forEach(network => {
      totalRx += network.rx_bytes || 0;
      totalTx += network.tx_bytes || 0;
    });

    return {
      rxBytes: totalRx,
      txBytes: totalTx,
      rxPackets: Object.values(networks).reduce((sum, net) => sum + (net.rx_packets || 0), 0),
      txPackets: Object.values(networks).reduce((sum, net) => sum + (net.tx_packets || 0), 0),
    };
  }

  calculateBlockIO(stats) {
    const blkioStats = stats.blkio_stats || {};
    const ioServiceBytes = blkioStats.io_service_bytes_recursive || [];
    
    let readBytes = 0;
    let writeBytes = 0;

    ioServiceBytes.forEach(stat => {
      if (stat.op === 'Read') readBytes += stat.value || 0;
      if (stat.op === 'Write') writeBytes += stat.value || 0;
    });

    return {
      readBytes,
      writeBytes,
      totalBytes: readBytes + writeBytes,
    };
  }

  async getDockerMetrics() {
    try {
      const info = await docker.info();
      const version = await docker.version();
      
      return {
        containers: info.Containers,
        containersRunning: info.ContainersRunning,
        containersPaused: info.ContainersPaused,
        containersStopped: info.ContainersStopped,
        images: info.Images,
        systemTime: info.SystemTime,
        kernelVersion: info.KernelVersion,
        architecture: info.Architecture,
        cpus: info.NCPU,
        totalMemory: info.MemTotal,
        dockerVersion: version.Version,
      };
    } catch (error) {
      logger.error('Error getting Docker metrics:', error.message);
      return {};
    }
  }

  async getNetworkMetrics() {
    try {
      // Get network statistics from /proc/net/dev
      const networkData = await this.executeCommand('cat /proc/net/dev');
      const networks = this.parseNetworkStats(networkData);
      
      return networks;
    } catch (error) {
      logger.error('Error getting network metrics:', error.message);
      return {};
    }
  }

  parseNetworkStats(data) {
    const networks = {};
    const lines = data.split('\\n');
    
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(/\\s+/);
      if (parts.length < 17) continue;
      
      const interface = parts[0].replace(':', '');
      networks[interface] = {
        rxBytes: parseInt(parts[1]) || 0,
        rxPackets: parseInt(parts[2]) || 0,
        rxErrors: parseInt(parts[3]) || 0,
        rxDropped: parseInt(parts[4]) || 0,
        txBytes: parseInt(parts[9]) || 0,
        txPackets: parseInt(parts[10]) || 0,
        txErrors: parseInt(parts[11]) || 0,
        txDropped: parseInt(parts[12]) || 0,
      };
    }
    
    return networks;
  }

  async getMemoryInfo() {
    try {
      const data = await this.executeCommand('cat /proc/meminfo');
      const memInfo = {};
      
      data.split('\\n').forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          memInfo[key.trim()] = value.trim();
        }
      });
      
      return memInfo;
    } catch (error) {
      logger.error('Error getting memory info:', error.message);
      return {};
    }
  }

  async getCpuInfo() {
    try {
      const data = await this.executeCommand('cat /proc/stat');
      const lines = data.split('\\n');
      const cpuLine = lines[0]; // First line contains overall CPU stats
      
      if (cpuLine.startsWith('cpu ')) {
        const values = cpuLine.split(/\\s+/).slice(1).map(Number);
        return {
          user: values[0] || 0,
          nice: values[1] || 0,
          system: values[2] || 0,
          idle: values[3] || 0,
          iowait: values[4] || 0,
          irq: values[5] || 0,
          softirq: values[6] || 0,
          steal: values[7] || 0,
        };
      }
      
      return {};
    } catch (error) {
      logger.error('Error getting CPU info:', error.message);
      return {};
    }
  }

  async getDiskInfo() {
    try {
      const data = await this.executeCommand('df -h');
      const disks = [];
      const lines = data.split('\\n').slice(1); // Skip header
      
      lines.forEach(line => {
        const parts = line.split(/\\s+/);
        if (parts.length >= 6) {
          disks.push({
            filesystem: parts[0],
            size: parts[1],
            used: parts[2],
            available: parts[3],
            usePercent: parts[4],
            mountpoint: parts[5],
          });
        }
      });
      
      return disks;
    } catch (error) {
      logger.error('Error getting disk info:', error.message);
      return [];
    }
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });
  }

  async saveMetrics(metrics) {
    try {
      const metricsData = {
        collectionInfo: {
          startTime: this.collectionStartTime,
          stats: this.collectionStats,
        },
        currentMetrics: metrics,
        history: metricsHistory.slice(-100), // Last 100 points
      };

      await fs.writeFile(
        CONFIG.metricsOutput,
        JSON.stringify(metricsData, null, 2)
      );
    } catch (error) {
      logger.error('Error saving metrics:', error.message);
    }
  }

  async saveFinalReport() {
    try {
      const reportPath = path.join(
        path.dirname(CONFIG.metricsOutput),
        `final-report-${Date.now()}.json`
      );

      const report = {
        testSession: {
          startTime: this.collectionStartTime,
          endTime: new Date(),
          duration: this.collectionStartTime 
            ? Date.now() - this.collectionStartTime.getTime()
            : 0,
        },
        statistics: this.collectionStats,
        metricsHistory,
        summary: await this.generateSummary(),
      };

      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      logger.info(`Final report saved to ${reportPath}`);
    } catch (error) {
      logger.error('Error saving final report:', error.message);
    }
  }

  async generateSummary() {
    if (metricsHistory.length === 0) return {};

    // Calculate averages and peaks
    const summary = {
      totalDataPoints: metricsHistory.length,
      timeRange: {
        start: metricsHistory[0]?.timestamp,
        end: metricsHistory[metricsHistory.length - 1]?.timestamp,
      },
      containerSummary: {},
    };

    // Analyze container performance
    const containerNames = new Set();
    metricsHistory.forEach(metric => {
      Object.keys(metric.containers || {}).forEach(name => containerNames.add(name));
    });

    containerNames.forEach(containerName => {
      const containerMetrics = metricsHistory
        .map(m => m.containers?.[containerName]?.metrics)
        .filter(Boolean);

      if (containerMetrics.length > 0) {
        summary.containerSummary[containerName] = {
          dataPoints: containerMetrics.length,
          cpu: {
            average: containerMetrics.reduce((sum, m) => sum + (m.cpu?.usage || 0), 0) / containerMetrics.length,
            peak: Math.max(...containerMetrics.map(m => m.cpu?.usage || 0)),
          },
          memory: {
            average: containerMetrics.reduce((sum, m) => sum + (m.memory?.percentage || 0), 0) / containerMetrics.length,
            peak: Math.max(...containerMetrics.map(m => m.memory?.percentage || 0)),
          },
          network: {
            totalRx: containerMetrics[containerMetrics.length - 1]?.network?.rxBytes || 0,
            totalTx: containerMetrics[containerMetrics.length - 1]?.network?.txBytes || 0,
          },
        };
      }
    });

    return summary;
  }

  getStats() {
    return {
      isCollecting: this.isCollecting,
      startTime: this.collectionStartTime,
      stats: this.collectionStats,
      historySize: metricsHistory.length,
      config: CONFIG,
    };
  }

  async getLatestMetrics(count = 10) {
    return metricsHistory.slice(-count);
  }
}

// Initialize collector
const collector = new PerformanceCollector();

// API endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    collector: collector.getStats(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/metrics/latest', async (req, res) => {
  const count = parseInt(req.query.count) || 10;
  const metrics = await collector.getLatestMetrics(count);
  res.json(metrics);
});

app.get('/metrics/stats', (req, res) => {
  res.json(collector.getStats());
});

app.post('/collection/start', async (req, res) => {
  try {
    await collector.startCollection();
    res.json({ status: 'started', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/collection/stop', async (req, res) => {
  try {
    await collector.stopCollection();
    res.json({ status: 'stopped', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(CONFIG.port, () => {
  logger.info(`Performance collector server started on port ${CONFIG.port}`);
  
  // Auto-start collection
  setTimeout(() => {
    collector.startCollection();
  }, 5000); // Start after 5 seconds
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await collector.stopCollection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await collector.stopCollection();
  process.exit(0);
});