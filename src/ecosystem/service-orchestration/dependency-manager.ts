/**
 * Intelligent Service Dependency Manager
 * 智能服务依赖管理器
 * 
 * 功能特性:
 * - 服务依赖关系分析和管理
 * - 依赖冲突检测和解决
 * - 服务启动顺序管理
 * - 依赖健康状态传播
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Dependency Types
interface ServiceDependency {
  serviceId: string;
  dependsOn: string;
  type: 'hard' | 'soft' | 'optional';
  healthPropagation: boolean;
  timeout: number;
  retries: number;
}

interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, DependencyEdge[]>;
}

interface DependencyNode {
  serviceId: string;
  status: 'pending' | 'ready' | 'failed' | 'blocked';
  startOrder: number;
  dependencyCount: number;
  dependentCount: number;
  lastUpdate: Date;
}

interface DependencyEdge {
  from: string;
  to: string;
  type: 'hard' | 'soft' | 'optional';
  weight: number;
  status: 'healthy' | 'degraded' | 'broken';
}

interface DependencyValidationResult {
  isValid: boolean;
  issues: DependencyIssue[];
  suggestions: string[];
  startupOrder: string[];
}

interface DependencyIssue {
  type: 'circular' | 'missing' | 'conflict' | 'timeout';
  severity: 'error' | 'warning' | 'info';
  services: string[];
  description: string;
  resolution: string;
}

// Data Flow Analysis
interface DataFlowEdge {
  from: string;
  to: string;
  dataType: string;
  volume: number;
  latency: number;
  criticality: 'high' | 'medium' | 'low';
  direction: 'bidirectional' | 'unidirectional';
}

interface DataFlowAnalysis {
  totalVolume: number;
  avgLatency: number;
  bottlenecks: string[];
  criticalPaths: string[][];
  optimizationSuggestions: string[];
}

@Injectable()
export class DependencyManager {
  private readonly logger = new Logger(DependencyManager.name);
  private dependencyGraph: DependencyGraph;
  private dataFlowGraph = new Map<string, DataFlowEdge[]>();
  private validationCache = new Map<string, DependencyValidationResult>();
  
  constructor(private readonly eventEmitter: EventEmitter2) {
    this.dependencyGraph = {
      nodes: new Map(),
      edges: new Map()
    };
    this.initializeDependencyGraph();
  }

  /**
   * 初始化依赖关系图
   */
  private initializeDependencyGraph(): void {
    // 定义服务依赖关系
    const dependencies: ServiceDependency[] = [
      // Infrastructure dependencies
      { serviceId: 'mongodb', dependsOn: 'none', type: 'hard', healthPropagation: true, timeout: 30000, retries: 3 },
      { serviceId: 'nats', dependsOn: 'none', type: 'hard', healthPropagation: true, timeout: 15000, retries: 3 },
      { serviceId: 'redis', dependsOn: 'none', type: 'optional', healthPropagation: false, timeout: 10000, retries: 2 },
      
      // Gateway dependencies
      { serviceId: 'app-gateway', dependsOn: 'mongodb', type: 'hard', healthPropagation: true, timeout: 30000, retries: 3 },
      { serviceId: 'app-gateway', dependsOn: 'nats', type: 'hard', healthPropagation: true, timeout: 15000, retries: 3 },
      { serviceId: 'app-gateway', dependsOn: 'redis', type: 'soft', healthPropagation: false, timeout: 10000, retries: 1 },
      
      // Microservice dependencies
      { serviceId: 'resume-parser-svc', dependsOn: 'mongodb', type: 'hard', healthPropagation: true, timeout: 30000, retries: 3 },
      { serviceId: 'resume-parser-svc', dependsOn: 'nats', type: 'hard', healthPropagation: true, timeout: 15000, retries: 3 },
      { serviceId: 'resume-parser-svc', dependsOn: 'gemini-api', type: 'hard', healthPropagation: true, timeout: 20000, retries: 2 },
      
      { serviceId: 'jd-extractor-svc', dependsOn: 'nats', type: 'hard', healthPropagation: true, timeout: 15000, retries: 3 },
      { serviceId: 'jd-extractor-svc', dependsOn: 'gemini-api', type: 'hard', healthPropagation: true, timeout: 20000, retries: 2 },
      
      { serviceId: 'scoring-engine-svc', dependsOn: 'mongodb', type: 'hard', healthPropagation: true, timeout: 30000, retries: 3 },
      { serviceId: 'scoring-engine-svc', dependsOn: 'nats', type: 'hard', healthPropagation: true, timeout: 15000, retries: 3 },
      { serviceId: 'scoring-engine-svc', dependsOn: 'gemini-api', type: 'hard', healthPropagation: true, timeout: 20000, retries: 2 },
      { serviceId: 'scoring-engine-svc', dependsOn: 'resume-parser-svc', type: 'soft', healthPropagation: false, timeout: 10000, retries: 1 },
      { serviceId: 'scoring-engine-svc', dependsOn: 'jd-extractor-svc', type: 'soft', healthPropagation: false, timeout: 10000, retries: 1 },
      
      { serviceId: 'report-generator-svc', dependsOn: 'mongodb', type: 'hard', healthPropagation: true, timeout: 30000, retries: 3 },
      { serviceId: 'report-generator-svc', dependsOn: 'nats', type: 'hard', healthPropagation: true, timeout: 15000, retries: 3 },
      { serviceId: 'report-generator-svc', dependsOn: 'gemini-api', type: 'hard', healthPropagation: true, timeout: 20000, retries: 2 },
      { serviceId: 'report-generator-svc', dependsOn: 'scoring-engine-svc', type: 'hard', healthPropagation: true, timeout: 15000, retries: 2 },
      
      // Frontend dependencies
      { serviceId: 'ai-recruitment-frontend', dependsOn: 'app-gateway', type: 'hard', healthPropagation: true, timeout: 15000, retries: 3 }
    ];

    this.buildDependencyGraph(dependencies);
    this.initializeDataFlowGraph();
    this.logger.log(`Dependency graph initialized with ${dependencies.length} dependencies`);
  }

  /**
   * 构建依赖关系图
   */
  private buildDependencyGraph(dependencies: ServiceDependency[]): void {
    const serviceIds = new Set<string>();
    
    // 收集所有服务ID
    dependencies.forEach(dep => {
      serviceIds.add(dep.serviceId);
      if (dep.dependsOn !== 'none') {
        serviceIds.add(dep.dependsOn);
      }
    });

    // 创建节点
    serviceIds.forEach(serviceId => {
      this.dependencyGraph.nodes.set(serviceId, {
        serviceId,
        status: 'pending',
        startOrder: 0,
        dependencyCount: 0,
        dependentCount: 0,
        lastUpdate: new Date()
      });
    });

    // 创建边
    dependencies.forEach(dep => {
      if (dep.dependsOn === 'none') return;

      if (!this.dependencyGraph.edges.has(dep.serviceId)) {
        this.dependencyGraph.edges.set(dep.serviceId, []);
      }

      this.dependencyGraph.edges.get(dep.serviceId)!.push({
        from: dep.dependsOn,
        to: dep.serviceId,
        type: dep.type,
        weight: this.calculateEdgeWeight(dep.type),
        status: 'healthy'
      });

      // 更新依赖计数
      const node = this.dependencyGraph.nodes.get(dep.serviceId)!;
      node.dependencyCount++;
      this.dependencyGraph.nodes.set(dep.serviceId, node);

      const depNode = this.dependencyGraph.nodes.get(dep.dependsOn)!;
      depNode.dependentCount++;
      this.dependencyGraph.nodes.set(dep.dependsOn, depNode);
    });

    // 计算启动顺序
    this.calculateStartupOrder();
  }

  /**
   * 计算边权重
   */
  private calculateEdgeWeight(type: 'hard' | 'soft' | 'optional'): number {
    switch (type) {
      case 'hard': return 10;
      case 'soft': return 5;
      case 'optional': return 1;
      default: return 1;
    }
  }

  /**
   * 计算服务启动顺序
   */
  private calculateStartupOrder(): void {
    const visited = new Set<string>();
    const inProgress = new Set<string>();
    const order: string[] = [];

    const visit = (serviceId: string): void => {
      if (visited.has(serviceId)) return;
      if (inProgress.has(serviceId)) {
        throw new Error(`Circular dependency detected involving ${serviceId}`);
      }

      inProgress.add(serviceId);
      
      const edges = this.dependencyGraph.edges.get(serviceId) || [];
      edges.forEach(edge => {
        if (edge.type === 'hard' || edge.type === 'soft') {
          visit(edge.from);
        }
      });

      inProgress.delete(serviceId);
      visited.add(serviceId);
      order.push(serviceId);
    };

    // 拓扑排序
    this.dependencyGraph.nodes.forEach((_, serviceId) => {
      if (!visited.has(serviceId)) {
        visit(serviceId);
      }
    });

    // 设置启动顺序
    order.forEach((serviceId, index) => {
      const node = this.dependencyGraph.nodes.get(serviceId)!;
      node.startOrder = index;
      this.dependencyGraph.nodes.set(serviceId, node);
    });
  }

  /**
   * 初始化数据流图
   */
  private initializeDataFlowGraph(): void {
    const dataFlows: DataFlowEdge[] = [
      {
        from: 'ai-recruitment-frontend',
        to: 'app-gateway',
        dataType: 'http-requests',
        volume: 1000,
        latency: 50,
        criticality: 'high',
        direction: 'bidirectional'
      },
      {
        from: 'app-gateway',
        to: 'resume-parser-svc',
        dataType: 'nats-messages',
        volume: 100,
        latency: 100,
        criticality: 'high',
        direction: 'unidirectional'
      },
      {
        from: 'app-gateway',
        to: 'jd-extractor-svc',
        dataType: 'nats-messages',
        volume: 50,
        latency: 80,
        criticality: 'medium',
        direction: 'unidirectional'
      },
      {
        from: 'resume-parser-svc',
        to: 'scoring-engine-svc',
        dataType: 'nats-messages',
        volume: 100,
        latency: 200,
        criticality: 'high',
        direction: 'unidirectional'
      },
      {
        from: 'jd-extractor-svc',
        to: 'scoring-engine-svc',
        dataType: 'nats-messages',
        volume: 50,
        latency: 150,
        criticality: 'medium',
        direction: 'unidirectional'
      },
      {
        from: 'scoring-engine-svc',
        to: 'report-generator-svc',
        dataType: 'nats-messages',
        volume: 80,
        latency: 500,
        criticality: 'medium',
        direction: 'unidirectional'
      }
    ];

    dataFlows.forEach(flow => {
      if (!this.dataFlowGraph.has(flow.from)) {
        this.dataFlowGraph.set(flow.from, []);
      }
      this.dataFlowGraph.get(flow.from)!.push(flow);
    });
  }

  /**
   * 验证依赖关系
   */
  async validateDependencies(): Promise<DependencyValidationResult> {
    const cacheKey = 'full-validation';
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const issues: DependencyIssue[] = [];
    const suggestions: string[] = [];

    // 检测循环依赖
    const circularDeps = this.detectCircularDependencies();
    if (circularDeps.length > 0) {
      issues.push({
        type: 'circular',
        severity: 'error',
        services: circularDeps,
        description: `Circular dependency detected: ${circularDeps.join(' -> ')}`,
        resolution: 'Redesign service architecture to break circular dependencies'
      });
    }

    // 检测缺失依赖
    const missingDeps = this.detectMissingDependencies();
    missingDeps.forEach(missing => {
      issues.push({
        type: 'missing',
        severity: 'error',
        services: [missing.service, missing.dependency],
        description: `Service ${missing.service} depends on missing service ${missing.dependency}`,
        resolution: `Implement ${missing.dependency} service or remove dependency`
      });
    });

    // 检测依赖冲突
    const conflicts = this.detectDependencyConflicts();
    conflicts.forEach(conflict => {
      issues.push({
        type: 'conflict',
        severity: 'warning',
        services: conflict.services,
        description: conflict.description,
        resolution: conflict.resolution
      });
    });

    // 生成启动顺序
    const startupOrder = this.generateStartupOrder();

    // 生成优化建议
    if (issues.length === 0) {
      suggestions.push('All dependencies are valid');
      suggestions.push('Consider implementing circuit breakers for external dependencies');
      suggestions.push('Monitor dependency health propagation');
    } else {
      suggestions.push('Fix critical dependency issues before deployment');
      suggestions.push('Consider implementing dependency health checks');
    }

    const result: DependencyValidationResult = {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      suggestions,
      startupOrder
    };

    this.validationCache.set(cacheKey, result);
    return result;
  }

  /**
   * 检测循环依赖
   */
  private detectCircularDependencies(): string[] {
    const visited = new Set<string>();
    const inProgress = new Set<string>();
    let cycle: string[] = [];

    const visit = (serviceId: string, path: string[]): boolean => {
      if (inProgress.has(serviceId)) {
        const cycleStart = path.indexOf(serviceId);
        cycle = path.slice(cycleStart);
        cycle.push(serviceId);
        return true;
      }

      if (visited.has(serviceId)) return false;

      visited.add(serviceId);
      inProgress.add(serviceId);
      path.push(serviceId);

      const edges = this.dependencyGraph.edges.get(serviceId) || [];
      for (const edge of edges) {
        if (edge.type === 'hard' && visit(edge.from, [...path])) {
          return true;
        }
      }

      inProgress.delete(serviceId);
      return false;
    };

    for (const serviceId of this.dependencyGraph.nodes.keys()) {
      if (!visited.has(serviceId)) {
        if (visit(serviceId, [])) {
          break;
        }
      }
    }

    return cycle;
  }

  /**
   * 检测缺失依赖
   */
  private detectMissingDependencies(): { service: string; dependency: string; }[] {
    const missing: { service: string; dependency: string; }[] = [];
    
    this.dependencyGraph.edges.forEach((edges, serviceId) => {
      edges.forEach(edge => {
        if (!this.dependencyGraph.nodes.has(edge.from)) {
          missing.push({
            service: serviceId,
            dependency: edge.from
          });
        }
      });
    });

    return missing;
  }

  /**
   * 检测依赖冲突
   */
  private detectDependencyConflicts(): { services: string[]; description: string; resolution: string; }[] {
    const conflicts: { services: string[]; description: string; resolution: string; }[] = [];

    // 检测版本冲突（简化示例）
    const versionMap = new Map<string, string[]>();
    
    this.dependencyGraph.nodes.forEach((_, serviceId) => {
      // 这里简化处理，实际应该检查具体的版本依赖
      if (serviceId.includes('-svc')) {
        const baseService = serviceId.replace('-svc', '');
        if (!versionMap.has(baseService)) {
          versionMap.set(baseService, []);
        }
        versionMap.get(baseService)!.push(serviceId);
      }
    });

    return conflicts;
  }

  /**
   * 生成启动顺序
   */
  private generateStartupOrder(): string[] {
    const nodes = Array.from(this.dependencyGraph.nodes.values())
      .sort((a, b) => a.startOrder - b.startOrder);
    
    return nodes.map(node => node.serviceId);
  }

  /**
   * 分析数据流
   */
  analyzeDataFlow(): DataFlowAnalysis {
    const flows = Array.from(this.dataFlowGraph.values()).flat();
    
    const totalVolume = flows.reduce((sum, flow) => sum + flow.volume, 0);
    const avgLatency = flows.reduce((sum, flow) => sum + flow.latency, 0) / flows.length;
    
    // 识别瓶颈
    const bottlenecks = flows
      .filter(flow => flow.latency > avgLatency * 2)
      .map(flow => `${flow.from}->${flow.to}`)
      .slice(0, 5);

    // 识别关键路径
    const criticalPaths = this.findCriticalPaths();

    // 生成优化建议
    const optimizationSuggestions = [
      'Consider implementing caching for high-volume data flows',
      'Optimize database queries for services with high latency',
      'Implement data compression for large message transfers',
      'Consider async processing for non-critical data flows'
    ];

    return {
      totalVolume,
      avgLatency,
      bottlenecks,
      criticalPaths,
      optimizationSuggestions
    };
  }

  /**
   * 查找关键路径
   */
  private findCriticalPaths(): string[][] {
    const paths: string[][] = [];
    
    // 简化实现 - 找到从前端到报告生成的路径
    const mainPath = [
      'ai-recruitment-frontend',
      'app-gateway',
      'resume-parser-svc',
      'scoring-engine-svc',
      'report-generator-svc'
    ];
    
    paths.push(mainPath);
    
    return paths;
  }

  /**
   * 更新依赖健康状态
   */
  updateDependencyHealth(serviceId: string, health: 'healthy' | 'degraded' | 'broken'): void {
    const edges = this.dependencyGraph.edges.get(serviceId) || [];
    edges.forEach(edge => {
      edge.status = health;
    });

    this.eventEmitter.emit('dependency.health.updated', {
      serviceId,
      health,
      timestamp: new Date()
    });

    // 传播健康状态到依赖服务
    this.propagateHealthStatus(serviceId, health);
  }

  /**
   * 传播健康状态
   */
  private propagateHealthStatus(serviceId: string, health: 'healthy' | 'degraded' | 'broken'): void {
    // 查找依赖于当前服务的所有服务
    this.dependencyGraph.edges.forEach((edges, dependentService) => {
      edges.forEach(edge => {
        if (edge.from === serviceId && edge.type === 'hard') {
          this.eventEmitter.emit('service.dependency.health.changed', {
            service: dependentService,
            dependency: serviceId,
            health,
            timestamp: new Date()
          });
        }
      });
    });
  }

  /**
   * 获取依赖图信息
   */
  getDependencyGraphInfo(): any {
    return {
      nodes: Object.fromEntries(this.dependencyGraph.nodes),
      edges: Object.fromEntries(this.dependencyGraph.edges),
      dataFlow: Object.fromEntries(this.dataFlowGraph),
      validation: this.validationCache.get('full-validation') || null
    };
  }

  /**
   * 优雅关闭
   */
  async shutdown(): Promise<void> {
    this.logger.log('Shutting down dependency manager...');
    this.validationCache.clear();
    this.logger.log('Dependency manager shutdown complete');
  }
}