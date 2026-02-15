import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrivacyComplianceController } from './privacy-compliance.controller';
import { PrivacyComplianceService } from './privacy-compliance.service';
import { UserProfile, UserProfileSchema } from '../schemas/user-profile.schema';
import {
  ConsentRecord,
  ConsentRecordSchema,
} from '../schemas/consent-record.schema';
import {
  DataSubjectRightsRequest,
  DataSubjectRightsRequestSchema,
} from '../schemas/data-subject-rights.schema';
import { ConsentManagementService } from './services/consent-management.service';
import { ConsentCascadeService } from './services/consent-cascade.service';
import { DataSubjectRightsService } from './services/data-subject-rights.service';
import { DataCollectionService } from './services/data-collection.service';
import { DataExportService } from './services/data-export.service';
import { DataErasureService } from './services/data-erasure.service';

/**
 * Privacy Compliance Module
 *
 * Provides GDPR compliance functionality including:
 * - Consent management and tracking
 * - Data subject rights (access, portability, erasure, etc.)
 * - Data collection from all services
 * - Secure data export
 * - Data erasure (right to be forgotten)
 *
 * Module organization:
 * - PrivacyComplianceService: Facade that delegates to specialized services
 * - ConsentManagementService: Core consent operations
 * - ConsentCascadeService: Consent withdrawal propagation
 * - DataSubjectRightsService: GDPR rights requests
 * - DataCollectionService: Data gathering from all services
 * - DataExportService: Secure export generation
 * - DataErasureService: Data deletion operations
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserProfile.name, schema: UserProfileSchema },
      { name: ConsentRecord.name, schema: ConsentRecordSchema },
      {
        name: DataSubjectRightsRequest.name,
        schema: DataSubjectRightsRequestSchema,
      },
    ]),
  ],
  controllers: [PrivacyComplianceController],
  providers: [
    PrivacyComplianceService,
    ConsentManagementService,
    ConsentCascadeService,
    DataSubjectRightsService,
    DataCollectionService,
    DataExportService,
    DataErasureService,
  ],
  exports: [PrivacyComplianceService],
})
export class PrivacyComplianceModule {}
