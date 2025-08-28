import { Module } from '@nestjs/common';
import { UsageLimitController } from './usage-limit.controller';
import { UsageLimitIntegrationService } from './usage-limit-integration.service';

@Module({
  controllers: [UsageLimitController],
  providers: [UsageLimitIntegrationService],
  exports: [UsageLimitIntegrationService]
})
export class UsageLimitModule {}