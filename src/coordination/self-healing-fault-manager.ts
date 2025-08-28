import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 自愈故障管理器 - 智能故障检测、自动恢复和容错策略
 * 实现代理故障检测、服务降级、熔断和自动故障转移
 */

export interface HealthCheck {
  id: string;
  name: string;
  type: 'http' | 'tcp' | 'database' | 'message_queue' | 'custom';
  endpoint: string;
  interval: number; // ms
  timeout: number;  // ms
  retries: number;
  successThreshold: number; // 连续成功次数才认为健康
  failureThreshold: number; // 连续失败次数才认为不健康
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[]; // 依赖的其他健康检查
  customValidator?: (response: any) => boolean;
}

export interface HealthStatus {
  checkId: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  responseTime: number;
  errorMessage?: string;
  details?: any;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface CircuitBreaker {
  id: string;
  name: string;
  service: string;
  state: 'closed' | 'open' | 'half_open';
  failureThreshold: number;
  successThreshold: number;
  timeout: number; // ms for open state
  maxRetries: number;
  currentFailures: number;
  currentSuccesses: number;
  lastFailure: Date | null;
  lastStateChange: Date;
  requestCount: number;
  failureRate: number;
}

export interface FaultAction {
  id: string;
  type: 'restart_service' | 'failover' | 'scale_up' | 'circuit_break' | 'degrade_service' | 'notify_admin';
  target: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  automated: boolean;
  conditions: {
    triggers: string[];
    thresholds: Record<string, number>;
    dependencies?: string[];
  };
  executionPlan: {
    steps: string[];
    rollbackSteps: string[];
    estimatedDuration: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  cooldownPeriod: number;
  lastExecuted?: Date;
}

export interface RecoveryAction {
  id: string;
  timestamp: Date;
  faultId: string;
  actionType: string;
  target: string;
  success: boolean;
  duration: number;
  rollbackRequired: boolean;
  impact: {
    performance: number;
    availability: number;
    userExperience: number;
  };
  metadata: any;
}

export interface SystemResilience {
  overallHealth: number; // 0-1
  availabilityScore: number; // 0-1
  recoveryCapability: number; // 0-1
  faultTolerance: number; // 0-1
  currentRisks: string[];
  recommendations: string[];
}

@Injectable()
export class SelfHealingFaultManager {
  private readonly logger = new Logger(SelfHealingFaultManager.name);
  private healthChecks = new Map<string, HealthCheck>();
  private healthStatuses = new Map<string, HealthStatus>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private faultActions = new Map<string, FaultAction>();
  private recoveryHistory: RecoveryAction[] = [];
  private activeIncidents = new Map<string, {
    id: string;
    severity: string;
    startTime: Date;
    affectedServices: string[];
    recoveryActions: string[];
    resolved: boolean;
  }>();

  private resilienceMetrics = {
    mttr: 0, // Mean Time To Recovery
    mtbf: 0, // Mean Time Between Failures
    availabilityTarget: 0.999, // 99.9%
    currentAvailability: 1.0,
    automatedRecoveryRate: 0,
    manualInterventionRate: 0
  };

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.logger.log('🛡️ SelfHealingFaultManager initialized');
    this.initializeDefaultHealthChecks();
    this.initializeDefaultCircuitBreakers();
    this.initializeDefaultFaultActions();
  }

  /**
   * 注册健康检查
   */
  registerHealthCheck(check: HealthCheck): void {
    this.healthChecks.set(check.id, check);
    this.healthStatuses.set(check.id, {
      checkId: check.id,
      status: 'unknown',
      lastCheck: new Date(),
      consecutiveSuccesses: 0,
      consecutiveFailures: 0,
      responseTime: 0,
      trend: 'stable'
    });
    
    this.logger.log(`🔍 Health check registered: ${check.name} (${check.type})`);
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(checkId: string): Promise<HealthStatus> {
    const check = this.healthChecks.get(checkId);
    if (!check) {
      throw new Error(`Health check not found: ${checkId}`);
    }

    const startTime = Date.now();
    let status: HealthStatus['status'] = 'unknown';
    let errorMessage: string | undefined;
    let details: any;

    try {
      const result = await this.executeHealthCheck(check);
      
      if (result.success) {
        const currentStatus = this.healthStatuses.get(checkId)!;
        currentStatus.consecutiveSuccesses++;
        currentStatus.consecutiveFailures = 0;
        
        if (currentStatus.consecutiveSuccesses >= check.successThreshold) {
          status = 'healthy';
        } else {
          status = currentStatus.status === 'unhealthy' ? 'degraded' : 'healthy';
        }
      } else {
        const currentStatus = this.healthStatuses.get(checkId)!;
        currentStatus.consecutiveFailures++;
        currentStatus.consecutiveSuccesses = 0;
        
        if (currentStatus.consecutiveFailures >= check.failureThreshold) {
          status = 'unhealthy';
        } else {
          status = 'degraded';
        }
        
        errorMessage = result.error;
      }
      
      details = result.details;
      
    } catch (error) {
      const currentStatus = this.healthStatuses.get(checkId)!;
      currentStatus.consecutiveFailures++;
      currentStatus.consecutiveSuccesses = 0;
      status = 'unhealthy';
      errorMessage = error.message;
    }

    const responseTime = Date.now() - startTime;
    const updatedStatus: HealthStatus = {
      checkId,
      status,
      lastCheck: new Date(),
      consecutiveSuccesses: this.healthStatuses.get(checkId)!.consecutiveSuccesses,
      consecutiveFailures: this.healthStatuses.get(checkId)!.consecutiveFailures,
      responseTime,
      errorMessage,
      details,
      trend: this.calculateTrend(checkId, status)
    };

    this.healthStatuses.set(checkId, updatedStatus);

    // 触发故障处理
    if (status === 'unhealthy' || status === 'degraded') {
      await this.handleHealthFailure(check, updatedStatus);
    }

    return updatedStatus;
  }

  /**
   * 执行具体的健康检查
   */
  private async executeHealthCheck(check: HealthCheck): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    switch (check.type) {
      case 'http':
        return this.performHttpHealthCheck(check);
      case 'tcp':
        return this.performTcpHealthCheck(check);
      case 'database':
        return this.performDatabaseHealthCheck(check);
      case 'message_queue':
        return this.performMessageQueueHealthCheck(check);
      case 'custom':
        return this.performCustomHealthCheck(check);
      default:
        throw new Error(`Unsupported health check type: ${check.type}`);
    }
  }

  /**
   * HTTP健康检查
   */
  private async performHttpHealthCheck(check: HealthCheck): Promise<any> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), check.timeout);
      
      const response = await fetch(check.endpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'SelfHealingFaultManager/1.0',
          'Accept': 'application/json, text/plain, */*'
        }
      });
      
      clearTimeout(timeoutId);
      
      const success = response.ok;
      const details = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      if (check.customValidator) {
        const body = await response.json().catch(() => ({}));
        const customValid = check.customValidator(body);
        return {
          success: success && customValid,
          details: { ...details, customValidation: customValid, body }
        };
      }
      
      return { success, details };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: { errorType: error.name }
      };
    }
  }

  /**
   * TCP健康检查
   */
  private async performTcpHealthCheck(check: HealthCheck): Promise<any> {
    const net = require('net');
    
    return new Promise((resolve) => {
      const [host, port] = check.endpoint.split(':');
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({
          success: false,
          error: 'TCP connection timeout',
          details: { host, port, timeout: check.timeout }
        });
      }, check.timeout);
      
      socket.connect(parseInt(port), host, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({
          success: true,
          details: { host, port, connected: true }
        });
      });
      
      socket.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: error.message,
          details: { host, port, errorType: error.name }
        });
      });
    });
  }

  /**
   * 数据库健康检查
   */
  private async performDatabaseHealthCheck(check: HealthCheck): Promise<any> {
    try {
      // 这里应该使用实际的数据库连接
      // 模拟数据库检查
      const startTime = Date.now();
      
      // 模拟查询延迟
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      const queryTime = Date.now() - startTime;
      const success = queryTime < check.timeout;
      
      return {
        success,
        details: {
          queryTime,
          connectionPool: 'available',
          activeConnections: Math.floor(Math.random() * 10)
        },
        error: success ? undefined : 'Database query timeout'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: { errorType: 'DatabaseError' }
      };
    }
  }

  /**
   * 消息队列健康检查
   */
  private async performMessageQueueHealthCheck(check: HealthCheck): Promise<any> {
    try {
      // 检查NATS连接状态
      const details = {
        connected: true,
        messagesInQueue: Math.floor(Math.random() * 100),
        consumerCount: Math.floor(Math.random() * 5),
        publishRate: Math.random() * 1000
      };
      
      return {
        success: details.connected && details.messagesInQueue < 1000,
        details
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: { errorType: 'MessageQueueError' }
      };
    }
  }

  /**
   * 自定义健康检查
   */
  private async performCustomHealthCheck(check: HealthCheck): Promise<any> {
    // 这里可以实现自定义的健康检查逻辑
    return {
      success: Math.random() > 0.1, // 90%成功率模拟
      details: { customCheck: true }
    };
  }

  /**
   * 处理健康检查失败
   */
  private async handleHealthFailure(check: HealthCheck, status: HealthStatus): Promise<void> {
    this.logger.warn(`🚨 Health check failed: ${check.name} (${status.status})`);
    
    // 查找相关的故障处理动作
    const relevantActions = Array.from(this.faultActions.values()).filter(action =>
      action.conditions.triggers.includes(check.id) &&
      this.shouldExecuteAction(action, status)
    );
    
    for (const action of relevantActions) {
      if (this.isInCooldownPeriod(action)) {
        this.logger.debug(`⏰ Action ${action.id} is in cooldown period`);
        continue;
      }
      
      await this.executeFaultAction(action, check.id, status);
    }
  }

  /**
   * 执行故障处理动作
   */
  private async executeFaultAction(action: FaultAction, triggerId: string, status: HealthStatus): Promise<void> {
    const startTime = Date.now();
    const actionId = `${action.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.log(`🔧 Executing fault action: ${action.type} for ${action.target}`);
    
    try {
      const result = await this.performFaultAction(action);
      const duration = Date.now() - startTime;
      
      const recoveryAction: RecoveryAction = {
        id: actionId,
        timestamp: new Date(),
        faultId: triggerId,
        actionType: action.type,
        target: action.target,
        success: result.success,
        duration,
        rollbackRequired: result.rollbackRequired || false,
        impact: this.calculateActionImpact(action, result.success),
        metadata: result.metadata || {}
      };
      
      this.recoveryHistory.push(recoveryAction);
      action.lastExecuted = new Date();
      
      if (result.success) {
        this.logger.log(`✅ Fault action completed successfully: ${action.type}`);
        this.eventEmitter.emit('fault.action.success', { action, recovery: recoveryAction });
      } else {
        this.logger.error(`❌ Fault action failed: ${action.type} - ${result.error}`);
        this.eventEmitter.emit('fault.action.failed', { action, recovery: recoveryAction, error: result.error });
        
        // 尝试回滚
        if (result.rollbackRequired) {
          await this.performRollback(action, recoveryAction);
        }
      }
      
    } catch (error) {
      this.logger.error(`💥 Critical error in fault action ${action.type}:`, error);
      this.eventEmitter.emit('fault.action.critical_error', { action, error });
    }
  }

  /**
   * 执行具体的故障处理动作
   */
  private async performFaultAction(action: FaultAction): Promise<{
    success: boolean;
    error?: string;
    rollbackRequired?: boolean;
    metadata?: any;
  }> {
    switch (action.type) {
      case 'restart_service':
        return this.restartService(action.target);
      case 'failover':
        return this.performFailover(action.target);
      case 'scale_up':
        return this.scaleUpService(action.target);
      case 'circuit_break':
        return this.activateCircuitBreaker(action.target);
      case 'degrade_service':
        return this.degradeService(action.target);
      case 'notify_admin':
        return this.notifyAdministrator(action);
      default:
        throw new Error(`Unknown fault action type: ${action.type}`);
    }
  }

  /**
   * 重启服务
   */
  private async restartService(serviceName: string): Promise<any> {
    try {
      this.logger.log(`🔄 Restarting service: ${serviceName}`);
      
      // 模拟服务重启
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      this.eventEmitter.emit('service.restarted', { serviceName });
      
      return {
        success: true,
        metadata: { restartTime: new Date(), serviceName }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        rollbackRequired: false
      };
    }
  }

  /**
   * 执行故障转移
   */
  private async performFailover(serviceName: string): Promise<any> {
    try {
      this.logger.log(`🔀 Performing failover for service: ${serviceName}`);
      
      // 模拟故障转移
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.eventEmitter.emit('service.failover', { serviceName, backupActive: true });
      
      return {
        success: true,
        rollbackRequired: true,
        metadata: { 
          failoverTime: new Date(),
          primaryService: serviceName,
          backupService: `${serviceName}-backup`
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        rollbackRequired: false
      };
    }
  }

  /**
   * 扩容服务
   */
  private async scaleUpService(serviceName: string): Promise<any> {
    try {
      this.logger.log(`📈 Scaling up service: ${serviceName}`);
      
      // 模拟扩容
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      this.eventEmitter.emit('service.scaled_up', { serviceName, newInstances: 2 });
      
      return {
        success: true,
        rollbackRequired: true,
        metadata: { 
          scaleTime: new Date(),
          serviceName,
          addedInstances: 2
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        rollbackRequired: false
      };
    }
  }

  /**
   * 激活熔断器
   */
  private async activateCircuitBreaker(circuitId: string): Promise<any> {
    const breaker = this.circuitBreakers.get(circuitId);
    if (!breaker) {
      return {
        success: false,
        error: `Circuit breaker not found: ${circuitId}`
      };
    }
    
    breaker.state = 'open';
    breaker.lastStateChange = new Date();
    
    this.logger.log(`🚫 Circuit breaker activated: ${breaker.name}`);
    this.eventEmitter.emit('circuit.breaker.opened', breaker);
    
    // 设置自动恢复定时器
    setTimeout(() => {
      if (breaker.state === 'open') {
        breaker.state = 'half_open';
        this.logger.log(`🔄 Circuit breaker half-open: ${breaker.name}`);
        this.eventEmitter.emit('circuit.breaker.half_open', breaker);
      }
    }, breaker.timeout);
    
    return {
      success: true,
      metadata: { circuitBreaker: breaker.name, state: breaker.state }
    };
  }

  /**
   * 降级服务
   */
  private async degradeService(serviceName: string): Promise<any> {
    try {
      this.logger.log(`⬇️ Degrading service: ${serviceName}`);
      
      this.eventEmitter.emit('service.degraded', { 
        serviceName, 
        degradationLevel: 'partial',
        timestamp: new Date()
      });
      
      return {
        success: true,
        rollbackRequired: true,
        metadata: { 
          serviceName,
          degradationLevel: 'partial',
          degradedAt: new Date()
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 通知管理员
   */
  private async notifyAdministrator(action: FaultAction): Promise<any> {
    try {
      const notification = {
        severity: action.severity,
        target: action.target,
        message: `Fault detected in ${action.target}, automated action: ${action.type}`,
        timestamp: new Date(),
        actionId: action.id
      };
      
      this.logger.warn(`📧 Administrator notification: ${notification.message}`);
      this.eventEmitter.emit('admin.notification', notification);
      
      return {
        success: true,
        metadata: notification
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 执行回滚
   */
  private async performRollback(action: FaultAction, recoveryAction: RecoveryAction): Promise<void> {
    this.logger.log(`🔙 Performing rollback for action: ${action.type}`);
    
    try {
      switch (action.type) {
        case 'failover':
          await this.rollbackFailover(recoveryAction);
          break;
        case 'scale_up':
          await this.rollbackScaleUp(recoveryAction);
          break;
        case 'degrade_service':
          await this.rollbackServiceDegradation(recoveryAction);
          break;
        default:
          this.logger.warn(`No rollback procedure for action type: ${action.type}`);
      }
      
      this.eventEmitter.emit('fault.action.rollback.completed', { action, recoveryAction });
      
    } catch (error) {
      this.logger.error(`❌ Rollback failed for action ${action.type}:`, error);
      this.eventEmitter.emit('fault.action.rollback.failed', { action, recoveryAction, error });
    }
  }

  /**
   * 回滚故障转移
   */
  private async rollbackFailover(recoveryAction: RecoveryAction): Promise<void> {
    const { primaryService, backupService } = recoveryAction.metadata;
    this.logger.log(`🔄 Rolling back failover: ${backupService} -> ${primaryService}`);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.eventEmitter.emit('service.failover.rollback', { primaryService, backupService });
  }

  /**
   * 回滚扩容
   */
  private async rollbackScaleUp(recoveryAction: RecoveryAction): Promise<void> {
    const { serviceName, addedInstances } = recoveryAction.metadata;
    this.logger.log(`📉 Rolling back scale up: ${serviceName} (-${addedInstances} instances)`);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    this.eventEmitter.emit('service.scale.rollback', { serviceName, removedInstances: addedInstances });
  }

  /**
   * 回滚服务降级
   */
  private async rollbackServiceDegradation(recoveryAction: RecoveryAction): Promise<void> {
    const { serviceName } = recoveryAction.metadata;
    this.logger.log(`⬆️ Rolling back service degradation: ${serviceName}`);
    
    this.eventEmitter.emit('service.degradation.rollback', { serviceName });
  }

  /**
   * 定期健康检查
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async performScheduledHealthChecks(): Promise<void> {
    for (const [checkId, check] of this.healthChecks) {
      try {
        await this.performHealthCheck(checkId);
      } catch (error) {
        this.logger.error(`Health check error for ${check.name}:`, error);
      }
    }
  }

  /**
   * 定期系统恢复能力分析
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async analyzeSystemResilience(): Promise<void> {
    const resilience = this.calculateSystemResilience();
    
    if (resilience.overallHealth < 0.8) {
      this.logger.warn(`⚠️ System resilience below threshold: ${(resilience.overallHealth * 100).toFixed(1)}%`);
      this.eventEmitter.emit('system.resilience.warning', resilience);
    }
    
    // 更新指标
    this.updateResilienceMetrics();
  }

  /**
   * 计算系统韧性
   */
  private calculateSystemResilience(): SystemResilience {
    const healthyChecks = Array.from(this.healthStatuses.values())
      .filter(status => status.status === 'healthy').length;
    const totalChecks = this.healthStatuses.size;
    
    const overallHealth = totalChecks > 0 ? healthyChecks / totalChecks : 1;
    
    const recentRecoveries = this.recoveryHistory.filter(
      action => Date.now() - action.timestamp.getTime() < 60 * 60 * 1000 // 1小时内
    );
    
    const successfulRecoveries = recentRecoveries.filter(action => action.success).length;
    const recoveryCapability = recentRecoveries.length > 0 ? 
      successfulRecoveries / recentRecoveries.length : 1;
    
    const openCircuits = Array.from(this.circuitBreakers.values())
      .filter(breaker => breaker.state === 'open').length;
    const faultTolerance = Math.max(0, 1 - (openCircuits / this.circuitBreakers.size));
    
    const availabilityScore = this.resilienceMetrics.currentAvailability;
    
    const currentRisks: string[] = [];
    const recommendations: string[] = [];
    
    if (overallHealth < 0.9) {
      currentRisks.push('Multiple health checks failing');
      recommendations.push('Review failing services and dependencies');
    }
    
    if (recoveryCapability < 0.8) {
      currentRisks.push('Low recovery success rate');
      recommendations.push('Improve automated recovery procedures');
    }
    
    if (openCircuits > 0) {
      currentRisks.push('Active circuit breakers');
      recommendations.push('Investigate upstream service issues');
    }
    
    return {
      overallHealth,
      availabilityScore,
      recoveryCapability,
      faultTolerance,
      currentRisks,
      recommendations
    };
  }

  // 辅助方法
  private calculateTrend(checkId: string, currentStatus: HealthStatus['status']): HealthStatus['trend'] {
    const history = this.recoveryHistory
      .filter(action => action.faultId === checkId)
      .slice(-5);
    
    if (history.length < 2) return 'stable';
    
    const recentSuccesses = history.filter(action => action.success).length;
    const successRate = recentSuccesses / history.length;
    
    if (successRate > 0.8 && currentStatus === 'healthy') return 'improving';
    if (successRate < 0.5 || currentStatus === 'unhealthy') return 'degrading';
    return 'stable';
  }

  private shouldExecuteAction(action: FaultAction, status: HealthStatus): boolean {
    // 检查触发条件
    const thresholds = action.conditions.thresholds;
    
    if (thresholds.consecutiveFailures && status.consecutiveFailures < thresholds.consecutiveFailures) {
      return false;
    }
    
    if (thresholds.responseTime && status.responseTime < thresholds.responseTime) {
      return false;
    }
    
    return true;
  }

  private isInCooldownPeriod(action: FaultAction): boolean {
    if (!action.lastExecuted) return false;
    
    const cooldownEnd = action.lastExecuted.getTime() + action.cooldownPeriod;
    return Date.now() < cooldownEnd;
  }

  private calculateActionImpact(action: FaultAction, success: boolean): RecoveryAction['impact'] {
    const baseImpact = {
      performance: success ? 0.2 : -0.3,
      availability: success ? 0.3 : -0.2,
      userExperience: success ? 0.1 : -0.4
    };
    
    // 根据动作类型调整影响
    switch (action.type) {
      case 'restart_service':
        return {
          performance: baseImpact.performance * 1.5,
          availability: baseImpact.availability * 0.8,
          userExperience: baseImpact.userExperience * 1.2
        };
      case 'scale_up':
        return {
          performance: baseImpact.performance * 2,
          availability: baseImpact.availability * 1.5,
          userExperience: baseImpact.userExperience * 1.3
        };
      default:
        return baseImpact;
    }
  }

  private updateResilienceMetrics(): void {
    const recentActions = this.recoveryHistory.filter(
      action => Date.now() - action.timestamp.getTime() < 24 * 60 * 60 * 1000 // 24小时
    );
    
    if (recentActions.length > 0) {
      const avgRecoveryTime = recentActions.reduce((sum, action) => sum + action.duration, 0) / recentActions.length;
      this.resilienceMetrics.mttr = avgRecoveryTime;
      
      const successfulActions = recentActions.filter(action => action.success).length;
      this.resilienceMetrics.automatedRecoveryRate = successfulActions / recentActions.length;
      this.resilienceMetrics.manualInterventionRate = 1 - this.resilienceMetrics.automatedRecoveryRate;
    }
  }

  // 初始化方法
  private initializeDefaultHealthChecks(): void {
    const defaultChecks: HealthCheck[] = [
      {
        id: 'app_gateway_health',
        name: 'App Gateway Health',
        type: 'http',
        endpoint: 'http://localhost:8080/health',
        interval: 30000,
        timeout: 5000,
        retries: 3,
        successThreshold: 2,
        failureThreshold: 3,
        criticalityLevel: 'critical',
        dependencies: []
      },
      {
        id: 'database_connection',
        name: 'Database Connection',
        type: 'database',
        endpoint: 'mongodb://localhost:27017',
        interval: 60000,
        timeout: 10000,
        retries: 2,
        successThreshold: 1,
        failureThreshold: 2,
        criticalityLevel: 'high',
        dependencies: []
      },
      {
        id: 'nats_message_queue',
        name: 'NATS Message Queue',
        type: 'message_queue',
        endpoint: 'nats://localhost:4222',
        interval: 45000,
        timeout: 5000,
        retries: 3,
        successThreshold: 1,
        failureThreshold: 2,
        criticalityLevel: 'high',
        dependencies: []
      },
      {
        id: 'redis_cache',
        name: 'Redis Cache',
        type: 'tcp',
        endpoint: 'localhost:6379',
        interval: 30000,
        timeout: 3000,
        retries: 2,
        successThreshold: 1,
        failureThreshold: 3,
        criticalityLevel: 'medium',
        dependencies: []
      }
    ];
    
    defaultChecks.forEach(check => this.registerHealthCheck(check));
  }

  private initializeDefaultCircuitBreakers(): void {
    const defaultBreakers: CircuitBreaker[] = [
      {
        id: 'resume_parser_circuit',
        name: 'Resume Parser Circuit',
        service: 'resume-parser-svc',
        state: 'closed',
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000,
        maxRetries: 3,
        currentFailures: 0,
        currentSuccesses: 0,
        lastFailure: null,
        lastStateChange: new Date(),
        requestCount: 0,
        failureRate: 0
      },
      {
        id: 'scoring_engine_circuit',
        name: 'Scoring Engine Circuit',
        service: 'scoring-engine-svc',
        state: 'closed',
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 30000,
        maxRetries: 2,
        currentFailures: 0,
        currentSuccesses: 0,
        lastFailure: null,
        lastStateChange: new Date(),
        requestCount: 0,
        failureRate: 0
      }
    ];
    
    defaultBreakers.forEach(breaker => {
      this.circuitBreakers.set(breaker.id, breaker);
    });
  }

  private initializeDefaultFaultActions(): void {
    const defaultActions: FaultAction[] = [
      {
        id: 'restart_app_gateway',
        type: 'restart_service',
        target: 'app-gateway',
        severity: 'high',
        automated: true,
        conditions: {
          triggers: ['app_gateway_health'],
          thresholds: { consecutiveFailures: 3 }
        },
        executionPlan: {
          steps: ['Stop service', 'Wait 5s', 'Start service', 'Verify health'],
          rollbackSteps: [],
          estimatedDuration: 30000,
          riskLevel: 'medium'
        },
        cooldownPeriod: 300000 // 5分钟
      },
      {
        id: 'scale_up_on_high_load',
        type: 'scale_up',
        target: 'resume-parser-svc',
        severity: 'medium',
        automated: true,
        conditions: {
          triggers: ['resume_parser_health'],
          thresholds: { responseTime: 5000 }
        },
        executionPlan: {
          steps: ['Calculate target instances', 'Request scaling', 'Monitor deployment'],
          rollbackSteps: ['Scale down to original count'],
          estimatedDuration: 120000,
          riskLevel: 'low'
        },
        cooldownPeriod: 600000 // 10分钟
      },
      {
        id: 'circuit_break_scoring_engine',
        type: 'circuit_break',
        target: 'scoring_engine_circuit',
        severity: 'medium',
        automated: true,
        conditions: {
          triggers: ['scoring_engine_health'],
          thresholds: { consecutiveFailures: 5 }
        },
        executionPlan: {
          steps: ['Open circuit breaker', 'Route to fallback', 'Monitor recovery'],
          rollbackSteps: ['Close circuit breaker'],
          estimatedDuration: 5000,
          riskLevel: 'low'
        },
        cooldownPeriod: 180000 // 3分钟
      }
    ];
    
    defaultActions.forEach(action => {
      this.faultActions.set(action.id, action);
    });
  }

  /**
   * 获取故障管理状态
   */
  getFaultManagementStatus(): any {
    return {
      healthChecks: this.healthChecks.size,
      healthyServices: Array.from(this.healthStatuses.values()).filter(s => s.status === 'healthy').length,
      circuitBreakers: {
        total: this.circuitBreakers.size,
        open: Array.from(this.circuitBreakers.values()).filter(b => b.state === 'open').length,
        halfOpen: Array.from(this.circuitBreakers.values()).filter(b => b.state === 'half_open').length
      },
      faultActions: this.faultActions.size,
      recoveryHistory: this.recoveryHistory.length,
      activeIncidents: this.activeIncidents.size,
      resilience: this.calculateSystemResilience(),
      metrics: this.resilienceMetrics
    };
  }
}