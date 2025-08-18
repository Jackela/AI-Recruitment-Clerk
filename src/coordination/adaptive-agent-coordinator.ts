import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * 智能代理协调器 - Multi-Agent自适应协调专家
 * 实现动态负载均衡和智能决策协调
 */

export interface AgentMetrics {
  id: string;
  type: 'gateway' | 'parser' | 'extractor' | 'scorer' | 'reporter' | 'websocket';
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  lastHealthCheck: Date;
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  capacity: number;
  currentLoad: number;
}

export interface TaskRequest {
  id: string;
  type: 'parse_resume' | 'extract_jd' | 'calculate_score' | 'generate_report' | 'websocket_broadcast';
  priority: 'low' | 'medium' | 'high' | 'critical';
  expectedDuration: number;
  resourceRequirements: {
    cpu: number;
    memory: number;
    network?: number;
  };
  dependencies?: string[];
  deadline?: Date;
  retryCount?: number;
}

export interface AgentAllocation {
  agentId: string;
  taskId: string;
  allocatedAt: Date;
  estimatedCompletion: Date;
  confidence: number;
}

export interface CoordinationStrategy {
  name: string;
  loadBalanceAlgorithm: 'round_robin' | 'least_connections' | 'weighted_response_time' | 'predictive';
  failoverThreshold: number;
  autoScaleThreshold: number;
  conflictResolutionPolicy: 'priority_based' | 'consensus' | 'leader_election' | 'quorum';
}

@Injectable()
export class AdaptiveAgentCoordinator {
  private readonly logger = new Logger(AdaptiveAgentCoordinator.name);
  private agents = new Map<string, AgentMetrics>();
  private pendingTasks = new Map<string, TaskRequest>();
  private activeTasks = new Map<string, AgentAllocation>();
  private coordinationHistory: Array<{
    timestamp: Date;
    action: string;
    agentId?: string;
    taskId?: string;
    metrics: any;
  }> = [];

  private strategy: CoordinationStrategy = {
    name: 'adaptive_intelligent',
    loadBalanceAlgorithm: 'predictive',
    failoverThreshold: 0.8,
    autoScaleThreshold: 0.75,
    conflictResolutionPolicy: 'priority_based'
  };

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.logger.log('🤖 AdaptiveAgentCoordinator initialized');
  }

  /**
   * 动态代理分配算法 - 核心智能调度
   */
  async allocateTask(task: TaskRequest): Promise<AgentAllocation | null> {
    this.logger.log(`🎯 Allocating task ${task.id} (type: ${task.type}, priority: ${task.priority})`);
    
    // 1. 筛选可用代理
    const availableAgents = this.getAvailableAgents(task.type);
    if (availableAgents.length === 0) {
      this.logger.warn(`⚠️ No available agents for task type: ${task.type}`);
      return null;
    }

    // 2. 智能评分算法
    const scoredAgents = await this.scoreAgentsForTask(availableAgents, task);
    
    // 3. 选择最优代理
    const selectedAgent = this.selectOptimalAgent(scoredAgents, task);
    
    if (!selectedAgent) {
      this.logger.warn(`⚠️ Failed to select optimal agent for task: ${task.id}`);
      return null;
    }

    // 4. 创建分配记录
    const allocation: AgentAllocation = {
      agentId: selectedAgent.agent.id,
      taskId: task.id,
      allocatedAt: new Date(),
      estimatedCompletion: new Date(Date.now() + task.expectedDuration),
      confidence: selectedAgent.score
    };

    // 5. 更新代理负载
    this.updateAgentLoad(selectedAgent.agent.id, task.resourceRequirements);
    
    // 6. 记录分配历史
    this.recordCoordinationAction('task_allocated', selectedAgent.agent.id, task.id, {
      score: selectedAgent.score,
      algorithm: this.strategy.loadBalanceAlgorithm
    });

    this.activeTasks.set(task.id, allocation);
    this.pendingTasks.delete(task.id);

    this.logger.log(`✅ Task ${task.id} allocated to agent ${selectedAgent.agent.id} (confidence: ${selectedAgent.score.toFixed(2)})`);
    
    // 7. 触发分配事件
    this.eventEmitter.emit('task.allocated', { task, allocation, agent: selectedAgent.agent });
    
    return allocation;
  }

  /**
   * 智能代理评分算法
   */
  private async scoreAgentsForTask(agents: AgentMetrics[], task: TaskRequest): Promise<Array<{agent: AgentMetrics, score: number}>> {
    const scoredAgents = await Promise.all(agents.map(async (agent) => {
      const score = await this.calculateAgentScore(agent, task);
      return { agent, score };
    }));

    return scoredAgents.sort((a, b) => b.score - a.score);
  }

  /**
   * 代理评分计算 - 多维度智能评估
   */
  private async calculateAgentScore(agent: AgentMetrics, task: TaskRequest): Promise<number> {
    // 基础性能得分 (0-40分)
    const performanceScore = this.calculatePerformanceScore(agent);
    
    // 负载情况得分 (0-25分)
    const loadScore = this.calculateLoadScore(agent, task);
    
    // 历史表现得分 (0-20分)
    const historyScore = await this.calculateHistoryScore(agent, task.type);
    
    // 资源匹配得分 (0-15分)
    const resourceScore = this.calculateResourceMatchScore(agent, task);
    
    // 紧急度调整 (-5 to +5分)
    const urgencyAdjustment = this.calculateUrgencyAdjustment(task);

    const totalScore = performanceScore + loadScore + historyScore + resourceScore + urgencyAdjustment;
    
    this.logger.debug(`Agent ${agent.id} score breakdown: perf=${performanceScore}, load=${loadScore}, history=${historyScore}, resource=${resourceScore}, urgency=${urgencyAdjustment}, total=${totalScore}`);
    
    return Math.max(0, Math.min(100, totalScore));
  }

  /**
   * 性能评分计算
   */
  private calculatePerformanceScore(agent: AgentMetrics): number {
    const cpuScore = (1 - agent.cpuUsage) * 15; // CPU使用率越低越好
    const memoryScore = (1 - agent.memoryUsage) * 15; // 内存使用率越低越好
    const responseScore = Math.max(0, (1000 - agent.responseTime) / 100) * 5; // 响应时间越短越好
    const errorScore = (1 - agent.errorRate) * 5; // 错误率越低越好
    
    return cpuScore + memoryScore + responseScore + errorScore;
  }

  /**
   * 负载评分计算
   */
  private calculateLoadScore(agent: AgentMetrics, task: TaskRequest): number {
    const currentLoadRatio = agent.currentLoad / agent.capacity;
    const afterTaskLoadRatio = (agent.currentLoad + this.estimateTaskLoad(task)) / agent.capacity;
    
    if (afterTaskLoadRatio > 0.9) return 0; // 超负荷
    if (afterTaskLoadRatio > 0.8) return 10; // 高负荷
    if (afterTaskLoadRatio > 0.6) return 20; // 中等负荷
    return 25; // 低负荷，最佳状态
  }

  /**
   * 历史表现评分
   */
  private async calculateHistoryScore(agent: AgentMetrics, taskType: string): Promise<number> {
    const recentHistory = this.coordinationHistory
      .filter(h => h.agentId === agent.id && h.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000))
      .slice(-10);

    if (recentHistory.length === 0) return 10; // 默认中等分数
    
    const successRate = recentHistory.filter(h => h.action === 'task_completed').length / recentHistory.length;
    const avgPerformance = recentHistory.reduce((sum, h) => sum + (h.metrics?.performance || 0.5), 0) / recentHistory.length;
    
    return (successRate * 10) + (avgPerformance * 10);
  }

  /**
   * 资源匹配评分
   */
  private calculateResourceMatchScore(agent: AgentMetrics, task: TaskRequest): number {
    const cpuMatch = task.resourceRequirements.cpu <= (1 - agent.cpuUsage) ? 5 : 0;
    const memoryMatch = task.resourceRequirements.memory <= (1 - agent.memoryUsage) ? 5 : 0;
    const capacityMatch = agent.capacity > agent.currentLoad ? 5 : 0;
    
    return cpuMatch + memoryMatch + capacityMatch;
  }

  /**
   * 紧急度调整
   */
  private calculateUrgencyAdjustment(task: TaskRequest): number {
    switch (task.priority) {
      case 'critical': return 5;
      case 'high': return 2;
      case 'medium': return 0;
      case 'low': return -2;
      default: return 0;
    }
  }

  /**
   * 获取可用代理
   */
  private getAvailableAgents(taskType: string): AgentMetrics[] {
    const agentTypeMapping = {
      'parse_resume': ['parser'],
      'extract_jd': ['extractor'],
      'calculate_score': ['scorer'],
      'generate_report': ['reporter'],
      'websocket_broadcast': ['websocket']
    };

    const requiredTypes = agentTypeMapping[taskType] || [];
    
    return Array.from(this.agents.values()).filter(agent => 
      requiredTypes.includes(agent.type) && 
      agent.status === 'healthy' &&
      agent.currentLoad < agent.capacity * 0.9
    );
  }

  /**
   * 选择最优代理
   */
  private selectOptimalAgent(scoredAgents: Array<{agent: AgentMetrics, score: number}>, task: TaskRequest): {agent: AgentMetrics, score: number} | null {
    if (scoredAgents.length === 0) return null;
    
    // 根据协调策略选择
    switch (this.strategy.loadBalanceAlgorithm) {
      case 'predictive':
        return this.selectByPredictiveAlgorithm(scoredAgents, task);
      case 'weighted_response_time':
        return this.selectByResponseTime(scoredAgents);
      case 'least_connections':
        return this.selectByLeastConnections(scoredAgents);
      case 'round_robin':
      default:
        return scoredAgents[0]; // 返回评分最高的
    }
  }

  /**
   * 预测性算法选择
   */
  private selectByPredictiveAlgorithm(scoredAgents: Array<{agent: AgentMetrics, score: number}>, task: TaskRequest): {agent: AgentMetrics, score: number} {
    // 结合历史数据和当前状态进行预测
    const predictions = scoredAgents.map(sa => {
      const predictedPerformance = this.predictAgentPerformance(sa.agent, task);
      return {
        ...sa,
        score: sa.score * 0.7 + predictedPerformance * 0.3
      };
    });
    
    return predictions.sort((a, b) => b.score - a.score)[0];
  }

  /**
   * 响应时间优先选择
   */
  private selectByResponseTime(scoredAgents: Array<{agent: AgentMetrics, score: number}>): {agent: AgentMetrics, score: number} {
    return scoredAgents.sort((a, b) => a.agent.responseTime - b.agent.responseTime)[0];
  }

  /**
   * 最少连接数选择
   */
  private selectByLeastConnections(scoredAgents: Array<{agent: AgentMetrics, score: number}>): {agent: AgentMetrics, score: number} {
    return scoredAgents.sort((a, b) => a.agent.currentLoad - b.agent.currentLoad)[0];
  }

  /**
   * 预测代理性能
   */
  private predictAgentPerformance(agent: AgentMetrics, task: TaskRequest): number {
    // 简化的性能预测模型
    const basePerformance = (agent.throughput / 100) * 0.4;
    const loadImpact = (1 - agent.currentLoad / agent.capacity) * 0.3;
    const healthImpact = agent.status === 'healthy' ? 0.3 : 0;
    
    return Math.min(1, basePerformance + loadImpact + healthImpact) * 100;
  }

  /**
   * 更新代理负载
   */
  private updateAgentLoad(agentId: string, resourceRequirements: TaskRequest['resourceRequirements']): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.currentLoad += this.estimateTaskLoad(resourceRequirements);
      agent.cpuUsage = Math.min(1, agent.cpuUsage + resourceRequirements.cpu);
      agent.memoryUsage = Math.min(1, agent.memoryUsage + resourceRequirements.memory);
    }
  }

  /**
   * 估算任务负载
   */
  private estimateTaskLoad(taskOrRequirements: TaskRequest | TaskRequest['resourceRequirements']): number {
    const requirements = 'cpu' in taskOrRequirements ? taskOrRequirements : taskOrRequirements.resourceRequirements;
    return (requirements.cpu + requirements.memory) * 50; // 简化的负载计算
  }

  /**
   * 记录协调操作
   */
  private recordCoordinationAction(action: string, agentId?: string, taskId?: string, metrics?: any): void {
    this.coordinationHistory.push({
      timestamp: new Date(),
      action,
      agentId,
      taskId,
      metrics
    });

    // 保持历史记录在合理范围内
    if (this.coordinationHistory.length > 1000) {
      this.coordinationHistory = this.coordinationHistory.slice(-500);
    }
  }

  /**
   * 注册代理
   */
  async registerAgent(agent: AgentMetrics): Promise<void> {
    this.agents.set(agent.id, agent);
    this.logger.log(`🤖 Agent registered: ${agent.id} (type: ${agent.type})`);
    this.eventEmitter.emit('agent.registered', agent);
  }

  /**
   * 更新代理指标
   */
  async updateAgentMetrics(agentId: string, metrics: Partial<AgentMetrics>): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      Object.assign(agent, metrics, { lastHealthCheck: new Date() });
      this.eventEmitter.emit('agent.metrics.updated', { agentId, metrics });
    }
  }

  /**
   * 任务完成处理
   */
  async completeTask(taskId: string, success: boolean, metrics?: any): Promise<void> {
    const allocation = this.activeTasks.get(taskId);
    if (!allocation) return;

    const agent = this.agents.get(allocation.agentId);
    if (agent) {
      // 释放代理负载
      const task = this.pendingTasks.get(taskId);
      if (task) {
        agent.currentLoad = Math.max(0, agent.currentLoad - this.estimateTaskLoad(task));
        agent.cpuUsage = Math.max(0, agent.cpuUsage - task.resourceRequirements.cpu);
        agent.memoryUsage = Math.max(0, agent.memoryUsage - task.resourceRequirements.memory);
      }
    }

    this.recordCoordinationAction(
      success ? 'task_completed' : 'task_failed',
      allocation.agentId,
      taskId,
      { success, performance: success ? 1 : 0, ...metrics }
    );

    this.activeTasks.delete(taskId);
    this.logger.log(`${success ? '✅' : '❌'} Task ${taskId} ${success ? 'completed' : 'failed'}`);
    
    this.eventEmitter.emit('task.completed', { taskId, success, allocation, metrics });
  }

  /**
   * 获取协调状态
   */
  getCoordinationStatus(): any {
    return {
      totalAgents: this.agents.size,
      healthyAgents: Array.from(this.agents.values()).filter(a => a.status === 'healthy').length,
      activeTasks: this.activeTasks.size,
      pendingTasks: this.pendingTasks.size,
      strategy: this.strategy,
      averageResponseTime: this.calculateAverageResponseTime(),
      systemLoad: this.calculateSystemLoad()
    };
  }

  /**
   * 计算平均响应时间
   */
  private calculateAverageResponseTime(): number {
    const agents = Array.from(this.agents.values());
    if (agents.length === 0) return 0;
    
    return agents.reduce((sum, agent) => sum + agent.responseTime, 0) / agents.length;
  }

  /**
   * 计算系统整体负载
   */
  private calculateSystemLoad(): number {
    const agents = Array.from(this.agents.values());
    if (agents.length === 0) return 0;
    
    return agents.reduce((sum, agent) => sum + (agent.currentLoad / agent.capacity), 0) / agents.length;
  }

  /**
   * 定期健康检查和优化
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async performHealthCheck(): Promise<void> {
    this.logger.debug('🔍 Performing system health check...');
    
    // 检查代理健康状态
    for (const [agentId, agent] of this.agents) {
      if (Date.now() - agent.lastHealthCheck.getTime() > 60000) {
        agent.status = 'offline';
        this.logger.warn(`⚠️ Agent ${agentId} marked as offline`);
        this.eventEmitter.emit('agent.offline', agent);
      }
    }

    // 检查超时任务
    for (const [taskId, allocation] of this.activeTasks) {
      if (Date.now() > allocation.estimatedCompletion.getTime() + 60000) {
        this.logger.warn(`⚠️ Task ${taskId} exceeded estimated completion time`);
        this.eventEmitter.emit('task.timeout', allocation);
      }
    }

    // 触发系统优化
    await this.optimizeSystemPerformance();
  }

  /**
   * 系统性能优化
   */
  private async optimizeSystemPerformance(): Promise<void> {
    const systemLoad = this.calculateSystemLoad();
    
    if (systemLoad > this.strategy.autoScaleThreshold) {
      this.logger.log(`📈 System load high (${systemLoad.toFixed(2)}), triggering optimization...`);
      this.eventEmitter.emit('system.high_load', { load: systemLoad });
      
      // 可以在这里实现自动扩容逻辑
      await this.redistributeTasks();
    }
  }

  /**
   * 任务重新分配
   */
  private async redistributeTasks(): Promise<void> {
    this.logger.log('🔄 Redistributing tasks for load balancing...');
    
    // 找出高负载代理的任务
    const highLoadAgents = Array.from(this.agents.values())
      .filter(agent => agent.currentLoad / agent.capacity > 0.8);
    
    for (const agent of highLoadAgents) {
      const agentTasks = Array.from(this.activeTasks.entries())
        .filter(([_, allocation]) => allocation.agentId === agent.id);
      
      // 尝试重新分配一些任务
      for (const [taskId, allocation] of agentTasks.slice(0, 2)) {
        const task = this.pendingTasks.get(taskId);
        if (task && task.priority !== 'critical') {
          this.logger.log(`🔄 Attempting to redistribute task ${taskId}`);
          // 这里可以实现任务迁移逻辑
        }
      }
    }
  }
}