import { Module } from '@nestjs/common';
import { QuotasController } from './quotas.controller';
import { LimitsController } from './limits.controller';
import { HistoryController } from './history.controller';
import { UsageLimitIntegrationService } from './usage-limit-integration.service';

/**
 * Configures the usage limit module.
 */
@Module({
  controllers: [QuotasController, LimitsController, HistoryController],
  providers: [UsageLimitIntegrationService],
  exports: [UsageLimitIntegrationService],
})
export class UsageLimitModule {}
