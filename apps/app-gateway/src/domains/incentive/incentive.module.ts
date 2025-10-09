import { Module } from '@nestjs/common';
import { IncentiveController } from './incentive.controller';
import { IncentiveIntegrationService } from './incentive-integration.service';

/**
 * Configures the incentive module.
 */
@Module({
  controllers: [IncentiveController],
  providers: [IncentiveIntegrationService],
  exports: [IncentiveIntegrationService],
})
export class IncentiveModule {}
