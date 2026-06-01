import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuestController } from './controllers/guest.controller';
import { GuestResumeController } from './controllers/guest-resume.controller';
import { GuestUsageService } from './services/guest-usage.service';
import { WebSocketDemoController } from './controllers/websocket-demo.controller';
import { WebSocketModule } from '../websocket/websocket.module';
import { GuestGuard } from './guards/guest.guard';
import { GuestUsage, GuestUsageSchema } from './schemas/guest-usage.schema';
import {
  GuestResumeAnalysis,
  GuestResumeAnalysisSchema,
} from './schemas/guest-resume-analysis.schema';
import { GuestResumeAnalysisService } from './services/guest-resume-analysis.service';
import { AppGatewayNatsService } from '../nats/app-gateway-nats.service';
import { GridFsService } from '../services/gridfs.service';

/**
 * Configures the guest module.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GuestUsage.name, schema: GuestUsageSchema },
      { name: GuestResumeAnalysis.name, schema: GuestResumeAnalysisSchema },
    ]),
    forwardRef(() => WebSocketModule),
  ],
  controllers: [
    GuestController,
    GuestResumeController,
    WebSocketDemoController,
  ],
  providers: [
    GuestUsageService,
    GuestResumeAnalysisService,
    GuestGuard,
    AppGatewayNatsService,
    GridFsService,
  ],
  exports: [
    GuestUsageService,
    GuestResumeAnalysisService,
    GuestGuard,
    GridFsService,
  ],
})
export class GuestModule {}
