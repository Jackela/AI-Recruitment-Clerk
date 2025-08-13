import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrivacyComplianceController } from './privacy-compliance.controller';
import { PrivacyComplianceService } from './privacy-compliance.service';
import { UserProfile, UserProfileSchema } from '../schemas/user-profile.schema';

/**
 * Privacy Compliance Module
 * Provides GDPR compliance functionality including consent management and data subject rights
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserProfile.name, schema: UserProfileSchema }
    ])
  ],
  controllers: [PrivacyComplianceController],
  providers: [PrivacyComplianceService],
  exports: [PrivacyComplianceService]
})
export class PrivacyComplianceModule {}