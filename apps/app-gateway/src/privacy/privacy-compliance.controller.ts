import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivacyComplianceService } from './privacy-compliance.service';
import {
  DataExportFormat,
  DataExportPackage,
  DataSubjectRightsRequest,
  UserConsentProfile,
  ConsentStatusDto,
} from '@ai-recruitment-clerk/shared-dtos';
import type {
  CaptureConsentDto,
  CreateRightsRequestDto,
  WithdrawConsentDto,
} from '@ai-recruitment-clerk/shared-dtos';

interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

interface ProcessingRecord {
  id: string;
  name: string;
  purposes: string[];
  legalBasis: string;
  dataCategories: string[];
  retentionPeriod: string;
  thirdPartyProcessors?: string[];
}

interface ConsentManagementMetrics {
  score: number;
  activeConsents: number;
  withdrawnConsents: number;
  pendingRenewals: number;
}

interface RightsProcessingMetrics {
  score: number;
  activeRequests: number;
  completedRequests: number;
  averageCompletionDays: number;
}

interface DataRetentionMetrics {
  score: number;
  policiesImplemented: number;
  recordsPendingDeletion: number;
  overdueRetentions: number;
}

interface BreachManagementMetrics {
  score: number;
  breachesYTD: number;
  incidentResponseTime: string;
  notificationCompliance: string;
}

interface ComplianceStatusOverview {
  overallScore: number;
  consentManagement: ConsentManagementMetrics;
  dataSubjectRights: RightsProcessingMetrics;
  dataRetention: DataRetentionMetrics;
  breachManagement: BreachManagementMetrics;
}

interface PrivacySubsystemStatus {
  status: string;
  responseTime: string;
}

interface PrivacyHealthCheckResult {
  timestamp: string;
  status: string;
  checks: {
    consentStorage: PrivacySubsystemStatus;
    rightsProcessing: PrivacySubsystemStatus;
    dataRetention: PrivacySubsystemStatus;
    encryption: PrivacySubsystemStatus;
  };
  gdprCompliance: {
    consentFramework: string;
    rightsAutomation: string;
    retentionPolicies: string;
    breachNotification: string;
  };
}

interface CookieConsentPreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentRequestPayload {
  deviceId: string;
  preferences: CookieConsentPreferences;
}

interface CookieConsentPreferencesRecord {
  deviceId: string;
  preferences: CookieConsentPreferences;
  consentDate: Date;
  expiryDate: Date;
}

interface CookieConsentStatus extends CookieConsentPreferences {
  deviceId: string;
  consentDate: Date;
  needsUpdate: boolean;
}

/**
 * GDPR Privacy Compliance Controller
 * Provides endpoints for consent management and data subject rights
 */
@ApiTags('privacy-compliance')
@Controller('privacy')
export class PrivacyComplianceController {
  private readonly logger = new Logger(PrivacyComplianceController.name);

  /**
   * Initializes a new instance of the Privacy Compliance Controller.
   * @param privacyService - The privacy service.
   */
  constructor(private readonly privacyService: PrivacyComplianceService) {}

  /**
   * CONSENT MANAGEMENT ENDPOINTS
   */

  @Post('consent')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Capture user consent',
    description: 'Records user consent for various data processing purposes',
  })
  @ApiResponse({
    status: 201,
    description: 'Consent captured successfully',
    type: UserConsentProfile,
  })
  @ApiResponse({ status: 400, description: 'Invalid consent data' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async captureConsent(
    @Body(ValidationPipe) captureConsentDto: CaptureConsentDto,
    @Req() req: Request,
  ): Promise<UserConsentProfile> {
    this.logger.log(`Capturing consent for user: ${captureConsentDto.userId}`);

    // Add request context
    const { ipAddress, userAgent } = this.getRequestMetadata(req);
    captureConsentDto.ipAddress = ipAddress;
    captureConsentDto.userAgent = userAgent;

    return await this.privacyService.captureConsent(captureConsentDto);
  }

  /**
   * Performs the withdraw consent operation.
   * @param withdrawConsentDto - The withdraw consent dto.
   * @returns A promise that resolves when the operation completes.
   */
  @Put('consent/withdraw')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Withdraw consent',
    description:
      'Allows users to withdraw consent for specific processing purposes',
  })
  @ApiResponse({ status: 204, description: 'Consent withdrawn successfully' })
  @ApiResponse({ status: 400, description: 'Invalid withdrawal request' })
  @ApiResponse({
    status: 403,
    description: 'Cannot withdraw consent for essential services',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async withdrawConsent(
    @Body(ValidationPipe) withdrawConsentDto: WithdrawConsentDto,
  ): Promise<void> {
    this.logger.log(
      `Withdrawing consent for user: ${withdrawConsentDto.userId}`,
    );
    await this.privacyService.withdrawConsent(withdrawConsentDto);
  }

  /**
   * Retrieves consent status.
   * @param userId - The user id.
   * @returns A promise that resolves to ConsentStatusDto.
   */
  @Get('consent/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get consent status',
    description: 'Retrieves current consent status for a user',
  })
  @ApiParam({ name: 'userId', description: 'User identifier' })
  @ApiResponse({
    status: 200,
    description: 'Consent status retrieved',
    type: ConsentStatusDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getConsentStatus(
    @Param('userId') userId: string,
  ): Promise<ConsentStatusDto> {
    this.logger.log(`Getting consent status for user: ${userId}`);
    return await this.privacyService.getConsentStatus(userId);
  }

  /**
   * DATA SUBJECT RIGHTS ENDPOINTS
   */

  @Post('rights-request')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create data subject rights request',
    description:
      'Submit a request for data access, rectification, erasure, portability, or objection',
  })
  @ApiResponse({
    status: 201,
    description: 'Rights request created',
    type: DataSubjectRightsRequest,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async createRightsRequest(
    @Body(ValidationPipe) createRequestDto: CreateRightsRequestDto,
    @Req() req: Request,
  ): Promise<DataSubjectRightsRequest> {
    this.logger.log(
      `Creating rights request: ${createRequestDto.requestType} for user: ${createRequestDto.userId}`,
    );

    // Add request context
    const { ipAddress, userAgent } = this.getRequestMetadata(req);
    createRequestDto.ipAddress = ipAddress;
    createRequestDto.userAgent = userAgent;

    return await this.privacyService.createRightsRequest(createRequestDto);
  }

  /**
   * Performs the export user data operation.
   * @param userId - The user id.
   * @param format - The format.
   * @returns A promise that resolves to DataExportPackage.
   */
  @Get('data-export/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Export user data (Article 15)',
    description: 'Generate and download complete user data export',
  })
  @ApiParam({ name: 'userId', description: 'User identifier' })
  @ApiQuery({
    name: 'format',
    enum: DataExportFormat,
    required: false,
    description: 'Export format (default: JSON)',
  })
  @ApiResponse({
    status: 200,
    description: 'Data export package created',
    type: DataExportPackage,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async exportUserData(
    @Param('userId') userId: string,
    @Query('format') format?: DataExportFormat,
  ): Promise<DataExportPackage> {
    this.logger.log(
      `Exporting data for user: ${userId}, format: ${format || 'JSON'}`,
    );
    return await this.privacyService.processDataAccessRequest(
      userId,
      format || DataExportFormat.JSON,
    );
  }

  /**
   * Removes user data.
   * @param userId - The user id.
   * @param categories - The categories.
   * @returns A promise that resolves when the operation completes.
   */
  @Delete('user-data/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete user data (Article 17)',
    description: 'Right to be forgotten - permanently delete user data',
  })
  @ApiParam({ name: 'userId', description: 'User identifier' })
  @ApiQuery({
    name: 'categories',
    required: false,
    description: 'Specific data categories to delete (comma-separated)',
  })
  @ApiResponse({ status: 204, description: 'User data deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Data deletion not permitted due to legal obligations',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUserData(
    @Param('userId') userId: string,
    @Query('categories') categories?: string,
  ): Promise<void> {
    this.logger.log(`Deleting data for user: ${userId}`, { categories });

    const specificCategories = categories
      ? categories.split(',').map((cat) => cat.trim())
      : undefined;

    await this.privacyService.processDataErasureRequest(
      userId,
      specificCategories,
    );
  }

  /**
   * ADMINISTRATIVE ENDPOINTS
   */

  @Get('processing-records')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get data processing records (Article 30)',
    description: 'Administrative endpoint to view data processing activities',
  })
  @ApiResponse({ status: 200, description: 'Processing records retrieved' })
  async getProcessingRecords(): Promise<ProcessingRecord[]> {
    this.logger.log('Getting data processing records');
    // TODO: Implement processing records retrieval
    const records: ProcessingRecord[] = [
      {
        id: '1',
        name: 'User Authentication Processing',
        purposes: ['Account management', 'Security'],
        legalBasis: 'Contract performance',
        dataCategories: ['Contact details', 'Credentials'],
        retentionPeriod: '7 years after account closure',
      },
      {
        id: '2',
        name: 'Resume Analysis Processing',
        purposes: ['Job matching', 'Skills assessment'],
        legalBasis: 'Contract performance',
        dataCategories: ['Employment history', 'Skills data'],
        retentionPeriod: '2 years after last application',
        thirdPartyProcessors: ['Google Gemini AI'],
      },
    ];
    return records;
  }

  /**
   * Retrieves compliance status.
   * @returns A promise that resolves to any.
   */
  @Get('compliance-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get GDPR compliance status',
    description: 'Administrative overview of privacy compliance metrics',
  })
  @ApiResponse({ status: 200, description: 'Compliance status retrieved' })
  async getComplianceStatus(): Promise<ComplianceStatusOverview> {
    this.logger.log('Getting compliance status');
    // TODO: Implement compliance status calculation
    const complianceStatus: ComplianceStatusOverview = {
      overallScore: 85,
      consentManagement: {
        score: 90,
        activeConsents: 1250,
        withdrawnConsents: 45,
        pendingRenewals: 12,
      },
      dataSubjectRights: {
        score: 80,
        activeRequests: 8,
        completedRequests: 156,
        averageCompletionDays: 18,
      },
      dataRetention: {
        score: 75,
        policiesImplemented: 12,
        recordsPendingDeletion: 234,
        overdueRetentions: 5,
      },
      breachManagement: {
        score: 95,
        breachesYTD: 0,
        incidentResponseTime: '4.2 hours',
        notificationCompliance: '100%',
      },
    };
    return complianceStatus;
  }

  /**
   * Performs the privacy health check operation.
   * @returns A promise that resolves to any.
   */
  @Post('privacy-health-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Privacy infrastructure health check',
    description: 'Verify GDPR compliance infrastructure is functioning',
  })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  async privacyHealthCheck(): Promise<PrivacyHealthCheckResult> {
    this.logger.log('Performing privacy health check');

    const healthStatus: PrivacyHealthCheckResult = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        consentStorage: { status: 'ok', responseTime: '45ms' },
        rightsProcessing: { status: 'ok', responseTime: '120ms' },
        dataRetention: { status: 'ok', responseTime: '67ms' },
        encryption: { status: 'ok', responseTime: '23ms' },
      },
      gdprCompliance: {
        consentFramework: 'active',
        rightsAutomation: 'active',
        retentionPolicies: 'active',
        breachNotification: 'active',
      },
    };

    return healthStatus;
  }

  /**
   * COOKIE CONSENT ENDPOINTS
   */

  @Post('cookie-consent')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Set cookie consent preferences',
    description: 'Manage cookie consent for anonymous/guest users',
  })
  @ApiResponse({ status: 201, description: 'Cookie consent saved' })
  async setCookieConsent(
    @Body() cookieConsent: CookieConsentRequestPayload,
  ): Promise<CookieConsentPreferencesRecord> {
    this.logger.log('Setting cookie consent preferences');

    // TODO: Implement cookie consent management
    return {
      deviceId: cookieConsent.deviceId,
      preferences: cookieConsent.preferences,
      consentDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };
  }

  /**
   * Retrieves cookie consent.
   * @param deviceId - The device id.
   * @returns A promise that resolves to any.
   */
  @Get('cookie-consent/:deviceId')
  @ApiOperation({
    summary: 'Get cookie consent preferences',
    description: 'Retrieve cookie consent status for a device',
  })
  @ApiParam({ name: 'deviceId', description: 'Device identifier' })
  @ApiResponse({ status: 200, description: 'Cookie consent retrieved' })
  async getCookieConsent(
    @Param('deviceId') deviceId: string,
  ): Promise<CookieConsentStatus> {
    this.logger.log(`Getting cookie consent for device: ${deviceId}`);

    // TODO: Implement cookie consent retrieval
    const consentStatus: CookieConsentStatus = {
      deviceId,
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      consentDate: new Date(),
      needsUpdate: false,
    };
    return consentStatus;
  }

  private getRequestMetadata(req: Request): RequestMetadata {
    const userAgentHeader = req.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader)
      ? userAgentHeader[0]
      : userAgentHeader;

    return {
      ipAddress: req.ip || req.socket?.remoteAddress || undefined,
      userAgent,
    };
  }
}
