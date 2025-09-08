import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserManagementModule } from './user-management/user-management.module';
import { QuestionnaireModule } from './questionnaire/questionnaire.module';
import { UsageLimitModule } from './usage-limit/usage-limit.module';
import { IncentiveModule } from './incentive/incentive.module';
import { AnalyticsModule } from './analytics/analytics.module';

/**
 * 领域模块集成层
 * 统一管理所有领域服务和数据访问层
 */
@Module({
  imports: [
    // 基础模块导入
    UserManagementModule,
    QuestionnaireModule,
    UsageLimitModule,
    IncentiveModule,
    AnalyticsModule,
  ],
  exports: [
    // 导出所有领域模块供其他模块使用
    UserManagementModule,
    QuestionnaireModule,
    UsageLimitModule,
    IncentiveModule,
    AnalyticsModule,
  ],
})
export class DomainsModule {}
