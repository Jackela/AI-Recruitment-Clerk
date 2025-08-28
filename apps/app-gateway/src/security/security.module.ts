import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SecurityMonitorService } from './security-monitor.service';
import { SecurityController } from './security.controller';
import { UserProfile, UserProfileSchema } from '../schemas/user-profile.schema';
import { EnhancedRateLimitMiddleware } from '../middleware/enhanced-rate-limit.middleware';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserProfile.name, schema: UserProfileSchema }]),
  ],
  providers: [
    SecurityMonitorService,
    EnhancedRateLimitMiddleware,
  ],
  controllers: [SecurityController],
  exports: [SecurityMonitorService],
})
export class SecurityModule {}