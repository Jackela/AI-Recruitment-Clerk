import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AppGatewayNatsService } from '../nats/app-gateway-nats.service';

/**
 * Configures the analysis module.
 */
@Module({
  controllers: [AnalysisController],
  providers: [AnalysisService, AppGatewayNatsService],
  exports: [AnalysisService],
})
export class AnalysisModule {}