import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SecurityMonitorService } from './security-monitor.service';
import { SecurityController } from './security.controller';
import { RedisTokenBlacklistService } from './redis-token-blacklist.service';
import { UserProfile, UserProfileSchema } from '../schemas/user-profile.schema';
import { EnhancedRateLimitMiddleware } from '../middleware/enhanced-rate-limit.middleware';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserProfile.name, schema: UserProfileSchema },
    ]),
  ],
  providers: [
    SecurityMonitorService,
    RedisTokenBlacklistService,
    EnhancedRateLimitMiddleware,
  ],
  controllers: [SecurityController],
  exports: [SecurityMonitorService, RedisTokenBlacklistService],
})
export class SecurityModule {}
