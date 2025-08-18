import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// 协调组件
import { AdaptiveAgentCoordinator } from './adaptive-agent-coordinator';
import { AdaptiveDecisionArbitrator } from './adaptive-decision-arbitrator';
import { SmartNatsRouter } from './smart-nats-router';
import { AdaptivePerformanceOptimizer } from './adaptive-performance-optimizer';
import { SelfHealingFaultManager } from './self-healing-fault-manager';
import { MultiAgentMonitoringHub } from './multi-agent-monitoring-hub';

/**
 * Multi-Agent协调模块
 * 整合所有智能协调组件，提供统一的多代理协调服务
 */
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({
      // 配置事件发射器
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    ScheduleModule.forRoot(),
  ],
  providers: [
    AdaptiveAgentCoordinator,
    AdaptiveDecisionArbitrator,
    SmartNatsRouter,
    AdaptivePerformanceOptimizer,
    SelfHealingFaultManager,
    MultiAgentMonitoringHub,
    {
      provide: 'COORDINATION_CONFIG',
      useFactory: () => ({
        // 协调系统配置
        maxAgents: 50,
        coordinationTimeout: 30000,
        conflictResolutionStrategy: 'priority_based',
        performanceProfile: 'balanced',
        monitoringInterval: 60000,
        healthCheckInterval: 30000,
        autoScalingEnabled: true,
        faultToleranceLevel: 'high',
        metricsRetention: 24 * 60 * 60 * 1000, // 24小时
        alertThresholds: {
          cpu: 0.8,
          memory: 0.85,
          errorRate: 0.05,
          latency: 1000
        }
      })
    }
  ],
  exports: [
    AdaptiveAgentCoordinator,
    AdaptiveDecisionArbitrator,
    SmartNatsRouter,
    AdaptivePerformanceOptimizer,
    SelfHealingFaultManager,
    MultiAgentMonitoringHub,
  ],
})
export class MultiAgentCoordinationModule {
  constructor() {
    console.log('🤖 MultiAgentCoordinationModule initialized - Smart coordination system ready');
  }
}