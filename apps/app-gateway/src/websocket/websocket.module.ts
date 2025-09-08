import { Module, forwardRef } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { CollaborationService } from './collaboration.service';
import { PresenceService } from './presence.service';
import { NotificationService } from './notification.service';
import { GuestModule } from '../guest/guest.module';
import { AppCacheModule } from '../cache/cache.module';

@Module({
  imports: [forwardRef(() => GuestModule), AppCacheModule],
  providers: [
    WebSocketGateway,
    CollaborationService,
    PresenceService,
    NotificationService,
  ],
  exports: [
    WebSocketGateway,
    CollaborationService,
    PresenceService,
    NotificationService,
  ],
})
export class WebSocketModule {}
