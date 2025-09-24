import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuestController } from './controllers/guest.controller';
import { GuestResumeController } from './controllers/guest-resume.controller';
import { GuestUsageService } from './services/guest-usage.service';
import { WebSocketDemoController } from './controllers/websocket-demo.controller';
import { WebSocketModule } from '../websocket/websocket.module';
import { GuestGuard } from './guards/guest.guard';
import { GuestUsage, GuestUsageSchema } from './schemas/guest-usage.schema';
import { NatsClient } from '../nats/nats.client';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GuestUsage.name, schema: GuestUsageSchema },
    ]),
    forwardRef(() => WebSocketModule),
  ],
  controllers: [
    GuestController,
    GuestResumeController,
    WebSocketDemoController,
  ],
  providers: [GuestUsageService, GuestGuard, NatsClient],
  exports: [GuestUsageService, GuestGuard],
})
export class GuestModule {}
