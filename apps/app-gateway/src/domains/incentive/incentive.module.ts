import { Module } from '@nestjs/common';
import { RewardsController } from './rewards.controller';
import { ReferralsController } from './referrals.controller';
import { IncentiveIntegrationService } from './incentive-integration.service';

/**
 * Configures the incentive module.
 */
@Module({
  controllers: [RewardsController, ReferralsController],
  providers: [IncentiveIntegrationService],
  exports: [IncentiveIntegrationService],
})
export class IncentiveModule {}
