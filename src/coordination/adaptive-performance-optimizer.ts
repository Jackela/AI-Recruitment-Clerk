import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 自适应性能优化器 - 智能负载调优和资源分配
 * 实现基于负载的自动扩缩容和智能缓存策略选择
 */

export interface ResourceMetrics {
  timestamp: Date;
  cpu: {
    usage: number;      // 0-1
    cores: number;
    temperature?: number;
  };
  memory: {
    used: number;       // bytes
    total: number;      // bytes
    heap?: number;      // bytes
    external?: number;  // bytes
  };
  network: {
    inbound: number;    // bytes/s
    outbound: number;   // bytes/s
    connections: number;
    latency: number;    // ms
  };
  storage: {
    read: number;       // ops/s
    write: number;      // ops/s
    space: number;      // bytes used
    iops: number;       // I/O operations per second
  };
}

export interface PerformanceProfile {
  name: string;
  cpuThresholds: {
    low: number;        // 0.3
    medium: number;     // 0.6
    high: number;       // 0.8
    critical: number;   // 0.95
  };
  memoryThresholds: {
    low: number;        // 0.4
    medium: number;     // 0.7
    high: number;       // 0.85
    critical: number;   // 0.95
  };
  networkThresholds: {
    latency: number;    // ms
    bandwidth: number;  // bytes/s
  };
  scalingRules: {
    scaleUpCpu: number;    // 0.8
    scaleDownCpu: number;  // 0.3
    scaleUpMemory: number; // 0.85
    scaleDownMemory: number; // 0.4
    cooldownPeriod: number; // ms
    minInstances: number;
    maxInstances: number;
  };
}

export interface CacheStrategy {
  name: string;
  type: 'lru' | 'lfu' | 'ttl' | 'adaptive';
  maxSize: number;
  ttl: number;
  evictionPolicy: 'size' | 'time' | 'access' | 'smart';
  compressionEnabled: boolean;
  warmupStrategy: 'lazy' | 'eager' | 'predictive';
  analytics: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    averageAccessTime: number;
  };
}

export interface ScalingAction {
  id: string;
  timestamp: Date;
  action: 'scale_up' | 'scale_down' | 'migrate' | 'optimize';
  target: string;
  reason: string;
  fromInstances: number;
  toInstances: number;
  expectedBenefit: {
    performance: number;
    cost: number;
    reliability: number;
  };
  duration: number;
  success: boolean;
}

export interface OptimizationRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'performance' | 'cost' | 'reliability' | 'security';
  title: string;
  description: string;
  impact: {
    performance: number; // -1 to 1
    cost: number;        // -1 to 1 (negative = savings)
    reliability: number; // -1 to 1
  };
  confidence: number; // 0-1
  implementationComplexity: 'low' | 'medium' | 'high';
  estimatedTimeToValue: number; // hours
  actions: string[];
}

@Injectable()
export class AdaptivePerformanceOptimizer {
  private readonly logger = new Logger(AdaptivePerformanceOptimizer.name);
  private resourceHistory: ResourceMetrics[] = [];
  private performanceProfiles = new Map<string, PerformanceProfile>();
  private cacheStrategies = new Map<string, CacheStrategy>();
  private scalingHistory: ScalingAction[] = [];
  private optimizationRecommendations: OptimizationRecommendation[] = [];
  
  private currentProfile: PerformanceProfile;
  private currentLoad = {
    cpu: 0,
    memory: 0,
    network: 0,
    storage: 0
  };
  
  private predictionModel = {
    cpuTrend: 0,
    memoryTrend: 0,
    loadPatterns: new Map<string, number[]>(),
    seasonalFactors: new Map<string, number>()
  };

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.logger.log('⚡ AdaptivePerformanceOptimizer initialized');
    this.initializeProfiles();
    this.initializeCacheStrategies();
    this.currentProfile = this.performanceProfiles.get('balanced')!;
  }

  /**
   * 收集资源指标
   */
  async collectResourceMetrics(): Promise<ResourceMetrics> {
    const metrics: ResourceMetrics = {
      timestamp: new Date(),
      cpu: await this.getCpuMetrics(),
      memory: await this.getMemoryMetrics(),
      network: await this.getNetworkMetrics(),
      storage: await this.getStorageMetrics()
    };

    this.resourceHistory.push(metrics);
    
    // 保持历史记录在合理范围内 (24小时)
    if (this.resourceHistory.length > 24 * 60) {
      this.resourceHistory = this.resourceHistory.slice(-12 * 60); // 保留12小时
    }

    this.updateCurrentLoad(metrics);
    await this.analyzePerformanceTrends(metrics);
    
    return metrics;
  }

  /**
   * 获取CPU指标
   */
  private async getCpuMetrics(): Promise<ResourceMetrics['cpu']> {
    const cpus = require('os').cpus();
    const loadavg = require('os').loadavg();
    
    return {
      usage: Math.min(1, loadavg[0] / cpus.length),
      cores: cpus.length,
      temperature: await this.getCpuTemperature()
    };
  }

  /**
   * 获取内存指标
   */
  private async getMemoryMetrics(): Promise<ResourceMetrics['memory']> {
    const process = require('process');
    const os = require('os');
    const memUsage = process.memoryUsage();
    
    return {
      used: os.totalmem() - os.freemem(),
      total: os.totalmem(),
      heap: memUsage.heapUsed,
      external: memUsage.external
    };
  }

  /**
   * 获取网络指标
   */
  private async getNetworkMetrics(): Promise<ResourceMetrics['network']> {
    // 简化实现 - 实际项目中可以使用更精确的网络监控
    return {
      inbound: this.estimateNetworkTraffic('inbound'),
      outbound: this.estimateNetworkTraffic('outbound'),
      connections: await this.getActiveConnections(),
      latency: await this.measureNetworkLatency()
    };
  }

  /**
   * 获取存储指标
   */
  private async getStorageMetrics(): Promise<ResourceMetrics['storage']> {
    const fs = require('fs');
    
    return {
      read: this.estimateIOPS('read'),
      write: this.estimateIOPS('write'),
      space: await this.getDiskUsage(),
      iops: this.estimateIOPS('total')
    };
  }

  /**
   * 性能趋势分析
   */
  private async analyzePerformanceTrends(currentMetrics: ResourceMetrics): Promise<void> {
    if (this.resourceHistory.length < 10) return;

    const recentHistory = this.resourceHistory.slice(-10);
    
    // 计算趋势
    this.predictionModel.cpuTrend = this.calculateTrend(recentHistory.map(m => m.cpu.usage));
    this.predictionModel.memoryTrend = this.calculateTrend(recentHistory.map(m => m.memory.used / m.memory.total));
    
    // 检测负载模式
    await this.detectLoadPatterns(currentMetrics);
    
    // 预测资源需求
    const predictions = await this.predictResourceDemand();
    
    // 生成优化建议
    await this.generateOptimizationRecommendations(predictions);
  }

  /**
   * 计算趋势
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + idx * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  /**
   * 检测负载模式
   */
  private async detectLoadPatterns(metrics: ResourceMetrics): Promise<void> {
    const hour = metrics.timestamp.getHours();
    const dayOfWeek = metrics.timestamp.getDay();
    const key = `${dayOfWeek}_${hour}`;
    
    const cpuUsage = metrics.cpu.usage;
    const memoryUsage = metrics.memory.used / metrics.memory.total;
    
    const pattern = this.predictionModel.loadPatterns.get(key) || [];
    pattern.push((cpuUsage + memoryUsage) / 2);
    
    // 保持最近30天的数据
    if (pattern.length > 30) {
      pattern.shift();
    }
    
    this.predictionModel.loadPatterns.set(key, pattern);
    
    // 计算季节性因子
    if (pattern.length >= 7) {
      const average = pattern.reduce((sum, val) => sum + val, 0) / pattern.length;
      this.predictionModel.seasonalFactors.set(key, average);
    }
  }

  /**
   * 预测资源需求
   */
  private async predictResourceDemand(): Promise<{
    cpu: { next1h: number; next6h: number; next24h: number };
    memory: { next1h: number; next6h: number; next24h: number };
    confidence: number;
  }> {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    
    // 基于历史模式预测
    const next1hKey = `${currentDay}_${(currentHour + 1) % 24}`;
    const next6hKey = `${currentDay}_${(currentHour + 6) % 24}`;
    const next24hKey = `${(currentDay + 1) % 7}_${currentHour}`;
    
    const predictions = {
      cpu: {
        next1h: this.predictForPeriod(next1hKey, this.predictionModel.cpuTrend, 1),
        next6h: this.predictForPeriod(next6hKey, this.predictionModel.cpuTrend, 6),
        next24h: this.predictForPeriod(next24hKey, this.predictionModel.cpuTrend, 24)
      },
      memory: {
        next1h: this.predictForPeriod(next1hKey, this.predictionModel.memoryTrend, 1),
        next6h: this.predictForPeriod(next6hKey, this.predictionModel.memoryTrend, 6),
        next24h: this.predictForPeriod(next24hKey, this.predictionModel.memoryTrend, 24)
      },
      confidence: this.calculatePredictionConfidence()
    };
    
    return predictions;
  }

  /**
   * 预测特定时期的负载
   */
  private predictForPeriod(patternKey: string, trend: number, hoursAhead: number): number {
    const seasonalFactor = this.predictionModel.seasonalFactors.get(patternKey) || this.currentLoad.cpu;
    const trendAdjustment = trend * hoursAhead;
    
    return Math.max(0, Math.min(1, seasonalFactor + trendAdjustment));
  }

  /**
   * 计算预测置信度
   */
  private calculatePredictionConfidence(): number {
    const historyLength = this.resourceHistory.length;
    const patternMaturity = this.predictionModel.loadPatterns.size;
    
    const historySufficiency = Math.min(1, historyLength / (24 * 7)); // 一周数据为满分
    const patternSufficiency = Math.min(1, patternMaturity / (7 * 24)); // 全周模式为满分
    
    return (historySufficiency + patternSufficiency) / 2;
  }

  /**
   * 生成优化建议
   */
  private async generateOptimizationRecommendations(predictions: any): Promise<void> {
    const recommendations: OptimizationRecommendation[] = [];
    
    // CPU优化建议
    if (predictions.cpu.next6h > this.currentProfile.cpuThresholds.high) {
      recommendations.push({
        id: `cpu_scale_${Date.now()}`,
        priority: 'high',
        category: 'performance',
        title: 'CPU扩容建议',
        description: `预测6小时内CPU使用率将达到${(predictions.cpu.next6h * 100).toFixed(1)}%，建议提前扩容`,
        impact: { performance: 0.8, cost: -0.3, reliability: 0.6 },
        confidence: predictions.confidence,
        implementationComplexity: 'medium',
        estimatedTimeToValue: 0.5,
        actions: ['增加CPU核心', '启用CPU自动扩缩容', '优化CPU密集型任务']
      });
    }
    
    // 内存优化建议
    if (predictions.memory.next6h > this.currentProfile.memoryThresholds.high) {
      recommendations.push({
        id: `memory_optimize_${Date.now()}`,
        priority: 'high',
        category: 'performance',
        title: '内存优化建议',
        description: `预测内存使用率过高，建议优化内存使用`,
        impact: { performance: 0.7, cost: -0.2, reliability: 0.8 },
        confidence: predictions.confidence,
        implementationComplexity: 'medium',
        estimatedTimeToValue: 1,
        actions: ['启用内存压缩', '优化缓存策略', '增加内存容量']
      });
    }
    
    // 缓存策略优化
    const cacheEfficiency = await this.analyzeCacheEfficiency();
    if (cacheEfficiency < 0.7) {
      recommendations.push({
        id: `cache_optimize_${Date.now()}`,
        priority: 'medium',
        category: 'performance',
        title: '缓存策略优化',
        description: `当前缓存命中率${(cacheEfficiency * 100).toFixed(1)}%，建议优化缓存策略`,
        impact: { performance: 0.6, cost: 0, reliability: 0.3 },
        confidence: 0.8,
        implementationComplexity: 'low',
        estimatedTimeToValue: 2,
        actions: ['调整缓存大小', '优化缓存键策略', '启用预加载']
      });
    }
    
    // 自动扩缩容建议
    const scalingOpportunity = await this.analyzeScalingOpportunity();
    if (scalingOpportunity.potential > 0.5) {
      recommendations.push({
        id: `autoscale_${Date.now()}`,
        priority: 'medium',
        category: 'cost',
        title: '自动扩缩容配置',
        description: `检测到${(scalingOpportunity.potential * 100).toFixed(1)}%的扩缩容优化空间`,
        impact: { performance: 0.4, cost: -0.6, reliability: 0.5 },
        confidence: scalingOpportunity.confidence,
        implementationComplexity: 'high',
        estimatedTimeToValue: 8,
        actions: ['配置HPA', '设置资源请求和限制', '优化扩缩容参数']
      });
    }
    
    this.optimizationRecommendations = recommendations;
    this.eventEmitter.emit('optimization.recommendations', recommendations);
  }

  /**
   * 自动扩缩容决策
   */
  async makeScalingDecision(): Promise<ScalingAction | null> {
    const metrics = await this.collectResourceMetrics();
    const predictions = await this.predictResourceDemand();
    
    // 检查扩容条件
    if (this.shouldScaleUp(metrics, predictions)) {
      return this.createScalingAction('scale_up', metrics, predictions);
    }
    
    // 检查缩容条件
    if (this.shouldScaleDown(metrics, predictions)) {
      return this.createScalingAction('scale_down', metrics, predictions);
    }
    
    return null;
  }

  /**
   * 检查是否需要扩容
   */
  private shouldScaleUp(metrics: ResourceMetrics, predictions: any): boolean {
    const cpuOverload = metrics.cpu.usage > this.currentProfile.scalingRules.scaleUpCpu;
    const memoryOverload = (metrics.memory.used / metrics.memory.total) > this.currentProfile.scalingRules.scaleUpMemory;
    const predictedOverload = predictions.cpu.next1h > this.currentProfile.scalingRules.scaleUpCpu;
    
    // 检查冷却期
    const lastScaling = this.scalingHistory[this.scalingHistory.length - 1];
    const cooldownExpired = !lastScaling || 
      (Date.now() - lastScaling.timestamp.getTime()) > this.currentProfile.scalingRules.cooldownPeriod;
    
    return (cpuOverload || memoryOverload || predictedOverload) && cooldownExpired;
  }

  /**
   * 检查是否需要缩容
   */
  private shouldScaleDown(metrics: ResourceMetrics, predictions: any): boolean {
    const cpuUnderused = metrics.cpu.usage < this.currentProfile.scalingRules.scaleDownCpu;
    const memoryUnderused = (metrics.memory.used / metrics.memory.total) < this.currentProfile.scalingRules.scaleDownMemory;
    const predictedUnderused = predictions.cpu.next6h < this.currentProfile.scalingRules.scaleDownCpu;
    
    const lastScaling = this.scalingHistory[this.scalingHistory.length - 1];
    const cooldownExpired = !lastScaling || 
      (Date.now() - lastScaling.timestamp.getTime()) > this.currentProfile.scalingRules.cooldownPeriod;
    
    return cpuUnderused && memoryUnderused && predictedUnderused && cooldownExpired;
  }

  /**
   * 创建扩缩容动作
   */
  private createScalingAction(action: 'scale_up' | 'scale_down', metrics: ResourceMetrics, predictions: any): ScalingAction {
    const currentInstances = this.getCurrentInstanceCount();
    const targetInstances = this.calculateTargetInstances(action, currentInstances, metrics);
    
    const scalingAction: ScalingAction = {
      id: `${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      action,
      target: 'application_instances',
      reason: this.generateScalingReason(action, metrics, predictions),
      fromInstances: currentInstances,
      toInstances: targetInstances,
      expectedBenefit: this.calculateExpectedBenefit(action, currentInstances, targetInstances),
      duration: 0,
      success: false
    };
    
    return scalingAction;
  }

  /**
   * 执行扩缩容动作
   */
  async executeScalingAction(action: ScalingAction): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`🚀 Executing scaling action: ${action.action} from ${action.fromInstances} to ${action.toInstances} instances`);
      
      // 实际的扩缩容实现 - 这里是模拟
      await this.performScaling(action);
      
      action.duration = Date.now() - startTime;
      action.success = true;
      this.scalingHistory.push(action);
      
      this.eventEmitter.emit('scaling.completed', action);
      this.logger.log(`✅ Scaling action completed in ${action.duration}ms`);
      
      return true;
      
    } catch (error) {
      action.duration = Date.now() - startTime;
      action.success = false;
      this.scalingHistory.push(action);
      
      this.logger.error(`❌ Scaling action failed:`, error);
      this.eventEmitter.emit('scaling.failed', { action, error });
      
      return false;
    }
  }

  /**
   * 优化缓存策略
   */
  async optimizeCacheStrategy(strategyName: string): Promise<CacheStrategy> {
    const currentStrategy = this.cacheStrategies.get(strategyName);
    if (!currentStrategy) {
      throw new Error(`Cache strategy not found: ${strategyName}`);
    }
    
    const metrics = currentStrategy.analytics;
    const optimizedStrategy = { ...currentStrategy };
    
    // 基于命中率优化
    if (metrics.hitRate < 0.7) {
      optimizedStrategy.maxSize = Math.min(optimizedStrategy.maxSize * 1.5, 1024 * 1024 * 1024); // 最大1GB
      optimizedStrategy.ttl = Math.max(optimizedStrategy.ttl * 1.2, 60000); // 最小1分钟
    }
    
    // 基于驱逐率优化
    if (metrics.evictionRate > 0.1) {
      optimizedStrategy.maxSize *= 1.3;
      optimizedStrategy.evictionPolicy = 'smart';
    }
    
    // 预加载策略优化
    if (metrics.averageAccessTime > 100) {
      optimizedStrategy.warmupStrategy = 'predictive';
    }
    
    this.cacheStrategies.set(strategyName, optimizedStrategy);
    this.eventEmitter.emit('cache.strategy.optimized', { strategyName, optimizedStrategy });
    
    return optimizedStrategy;
  }

  /**
   * 定期性能监控和优化
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async performPerformanceCheck(): Promise<void> {
    try {
      await this.collectResourceMetrics();
      
      // 检查是否需要扩缩容
      const scalingAction = await this.makeScalingDecision();
      if (scalingAction) {
        await this.executeScalingAction(scalingAction);
      }
      
      // 检查缓存策略优化
      for (const [name, strategy] of this.cacheStrategies) {
        if (strategy.analytics.hitRate < 0.6) {
          await this.optimizeCacheStrategy(name);
        }
      }
      
    } catch (error) {
      this.logger.error('❌ Performance check failed:', error);
    }
  }

  /**
   * 定期清理历史数据
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupHistoricalData(): Promise<void> {
    const now = Date.now();
    const retentionPeriod = 24 * 60 * 60 * 1000; // 24小时
    
    // 清理资源历史
    this.resourceHistory = this.resourceHistory.filter(
      metrics => now - metrics.timestamp.getTime() < retentionPeriod
    );
    
    // 清理扩缩容历史
    this.scalingHistory = this.scalingHistory.filter(
      action => now - action.timestamp.getTime() < retentionPeriod * 7 // 保留7天
    );
    
    this.logger.debug('🧹 Historical data cleanup completed');
  }

  // 初始化方法
  private initializeProfiles(): void {
    const profiles: Array<[string, PerformanceProfile]> = [
      ['conservative', {
        name: 'conservative',
        cpuThresholds: { low: 0.2, medium: 0.4, high: 0.6, critical: 0.8 },
        memoryThresholds: { low: 0.3, medium: 0.5, high: 0.7, critical: 0.85 },
        networkThresholds: { latency: 500, bandwidth: 100 * 1024 * 1024 },
        scalingRules: {
          scaleUpCpu: 0.6, scaleDownCpu: 0.2,
          scaleUpMemory: 0.7, scaleDownMemory: 0.3,
          cooldownPeriod: 5 * 60 * 1000,
          minInstances: 2, maxInstances: 10
        }
      }],
      ['balanced', {
        name: 'balanced',
        cpuThresholds: { low: 0.3, medium: 0.6, high: 0.8, critical: 0.95 },
        memoryThresholds: { low: 0.4, medium: 0.7, high: 0.85, critical: 0.95 },
        networkThresholds: { latency: 200, bandwidth: 500 * 1024 * 1024 },
        scalingRules: {
          scaleUpCpu: 0.8, scaleDownCpu: 0.3,
          scaleUpMemory: 0.85, scaleDownMemory: 0.4,
          cooldownPeriod: 3 * 60 * 1000,
          minInstances: 1, maxInstances: 20
        }
      }],
      ['aggressive', {
        name: 'aggressive',
        cpuThresholds: { low: 0.4, medium: 0.7, high: 0.9, critical: 0.98 },
        memoryThresholds: { low: 0.5, medium: 0.8, high: 0.9, critical: 0.98 },
        networkThresholds: { latency: 100, bandwidth: 1024 * 1024 * 1024 },
        scalingRules: {
          scaleUpCpu: 0.9, scaleDownCpu: 0.4,
          scaleUpMemory: 0.9, scaleDownMemory: 0.5,
          cooldownPeriod: 1 * 60 * 1000,
          minInstances: 1, maxInstances: 50
        }
      }]
    ];
    
    profiles.forEach(([name, profile]) => {
      this.performanceProfiles.set(name, profile);
    });
  }

  private initializeCacheStrategies(): void {
    const strategies: Array<[string, CacheStrategy]> = [
      ['redis_primary', {
        name: 'redis_primary',
        type: 'lru',
        maxSize: 512 * 1024 * 1024, // 512MB
        ttl: 3600000, // 1小时
        evictionPolicy: 'smart',
        compressionEnabled: true,
        warmupStrategy: 'predictive',
        analytics: { hitRate: 0.85, missRate: 0.15, evictionRate: 0.05, averageAccessTime: 15 }
      }],
      ['memory_cache', {
        name: 'memory_cache',
        type: 'lfu',
        maxSize: 128 * 1024 * 1024, // 128MB
        ttl: 1800000, // 30分钟
        evictionPolicy: 'access',
        compressionEnabled: false,
        warmupStrategy: 'eager',
        analytics: { hitRate: 0.92, missRate: 0.08, evictionRate: 0.02, averageAccessTime: 5 }
      }]
    ];
    
    strategies.forEach(([name, strategy]) => {
      this.cacheStrategies.set(name, strategy);
    });
  }

  // 辅助方法实现
  private async getCpuTemperature(): Promise<number | undefined> {
    // 简化实现 - 实际项目中可以读取系统温度
    return undefined;
  }

  private estimateNetworkTraffic(direction: 'inbound' | 'outbound'): number {
    // 简化实现
    return Math.random() * 10 * 1024 * 1024; // 0-10MB/s
  }

  private async getActiveConnections(): Promise<number> {
    // 简化实现
    return Math.floor(Math.random() * 1000);
  }

  private async measureNetworkLatency(): Promise<number> {
    // 简化实现
    return Math.random() * 100; // 0-100ms
  }

  private estimateIOPS(type: 'read' | 'write' | 'total'): number {
    // 简化实现
    return Math.random() * 1000;
  }

  private async getDiskUsage(): Promise<number> {
    // 简化实现
    return Math.random() * 100 * 1024 * 1024 * 1024; // 0-100GB
  }

  private updateCurrentLoad(metrics: ResourceMetrics): void {
    this.currentLoad.cpu = metrics.cpu.usage;
    this.currentLoad.memory = metrics.memory.used / metrics.memory.total;
    this.currentLoad.network = (metrics.network.inbound + metrics.network.outbound) / (100 * 1024 * 1024);
    this.currentLoad.storage = metrics.storage.iops / 1000;
  }

  private async analyzeCacheEfficiency(): Promise<number> {
    let totalHitRate = 0;
    let strategyCount = 0;
    
    for (const strategy of this.cacheStrategies.values()) {
      totalHitRate += strategy.analytics.hitRate;
      strategyCount++;
    }
    
    return strategyCount > 0 ? totalHitRate / strategyCount : 0.8;
  }

  private async analyzeScalingOpportunity(): Promise<{ potential: number; confidence: number }> {
    const recentMetrics = this.resourceHistory.slice(-10);
    if (recentMetrics.length < 5) {
      return { potential: 0, confidence: 0 };
    }
    
    const avgCpu = recentMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentMetrics.length;
    const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memory.used / m.memory.total, 0) / recentMetrics.length;
    
    const potential = Math.max(0, 1 - Math.max(avgCpu, avgMemory) * 2);
    const confidence = recentMetrics.length / 10;
    
    return { potential, confidence };
  }

  private getCurrentInstanceCount(): number {
    // 简化实现 - 实际项目中应该查询容器编排系统
    return 3;
  }

  private calculateTargetInstances(action: 'scale_up' | 'scale_down', current: number, metrics: ResourceMetrics): number {
    const factor = action === 'scale_up' ? 1.5 : 0.7;
    const target = Math.round(current * factor);
    
    return Math.max(
      this.currentProfile.scalingRules.minInstances,
      Math.min(this.currentProfile.scalingRules.maxInstances, target)
    );
  }

  private generateScalingReason(action: 'scale_up' | 'scale_down', metrics: ResourceMetrics, predictions: any): string {
    const cpuUsage = (metrics.cpu.usage * 100).toFixed(1);
    const memoryUsage = ((metrics.memory.used / metrics.memory.total) * 100).toFixed(1);
    
    return `${action === 'scale_up' ? '扩容' : '缩容'}: CPU ${cpuUsage}%, Memory ${memoryUsage}%, 预测负载趋势 ${predictions.cpu.next1h > 0.8 ? '上升' : '下降'}`;
  }

  private calculateExpectedBenefit(action: 'scale_up' | 'scale_down', from: number, to: number): ScalingAction['expectedBenefit'] {
    const scaleFactor = to / from;
    
    if (action === 'scale_up') {
      return {
        performance: 0.3 * (scaleFactor - 1),
        cost: -0.5 * (scaleFactor - 1),
        reliability: 0.4 * (scaleFactor - 1)
      };
    } else {
      return {
        performance: -0.2 * (1 - scaleFactor),
        cost: 0.6 * (1 - scaleFactor),
        reliability: -0.1 * (1 - scaleFactor)
      };
    }
  }

  private async performScaling(action: ScalingAction): Promise<void> {
    // 模拟扩缩容操作
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.eventEmitter.emit('instances.scaled', {
      action: action.action,
      from: action.fromInstances,
      to: action.toInstances
    });
  }

  /**
   * 获取性能状态
   */
  getPerformanceStatus(): any {
    return {
      currentLoad: this.currentLoad,
      currentProfile: this.currentProfile.name,
      resourceHistory: this.resourceHistory.length,
      scalingHistory: this.scalingHistory.length,
      optimizationRecommendations: this.optimizationRecommendations.length,
      predictionModel: {
        cpuTrend: this.predictionModel.cpuTrend,
        memoryTrend: this.predictionModel.memoryTrend,
        loadPatterns: this.predictionModel.loadPatterns.size,
        seasonalFactors: this.predictionModel.seasonalFactors.size
      },
      cacheStrategies: Array.from(this.cacheStrategies.keys()),
      recentRecommendations: this.optimizationRecommendations.slice(-5)
    };
  }
}