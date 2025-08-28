/**
 * Service Orchestration Module
 * 服务编排模块
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { OrchestrationEngine } from './orchestration-engine';
import { DependencyManager } from './dependency-manager';
import { OrchestrationController } from './orchestration.controller';
import { OrchestrationEventHandler } from './orchestration-event.handler';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
  ],
  providers: [
    OrchestrationEngine,
    DependencyManager,
    OrchestrationEventHandler
  ],
  controllers: [
    OrchestrationController
  ],
  exports: [
    OrchestrationEngine,
    DependencyManager
  ]
})
export class OrchestrationModule {}