/**
 * @fileoverview Privacy Compliance Controller Tests - Comprehensive test coverage for GDPR/privacy endpoints
 * @author AI Recruitment Team
 * @since v1.0.0
 * @version v1.0.0
 * @module PrivacyComplianceControllerTests
 */

import { ForbiddenException } from '@nestjs/common';
import { PrivacyComplianceController } from './privacy-compliance.controller';
import type { PrivacyComplianceService } from './privacy-compliance.service';
import type {
  CaptureConsentDto,
  WithdrawConsentDto,
  ConsentStatusDto,
  UserConsentProfile,
  CreateRightsRequestDto,
  DataSubjectRightsRequest,
  DataExportPackage,
} from '@ai-recruitment-clerk/shared-dtos';
import {
  ConsentPurpose,
  ConsentStatus,
  ConsentMethod,
  DataSubjectRightType,
  DataExportFormat,
  RequestStatus,
} from '@ai-recruitment-clerk/shared-dtos';

describe('PrivacyComplianceController', () => {
  let controller: PrivacyComplianceController;
  let privacyService: jest.Mocked<PrivacyComplianceService>;

  const mockUserId = 'user-123';
  const mockDeviceId = 'device-456';

  const mockRequest = {
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    headers: {
      'user-agent': 'Mozilla/5.0 (Test Browser)',
    },
  };

  const mockUserConsentProfile: UserConsentProfile = {
    userId: mockUserId,
    consentRecords: [
      {
        id: 'consent-1',
        userId: mockUserId,
        purpose: ConsentPurpose.MARKETING,
        status: ConsentStatus.GRANTED,
        dataCategories: [],
        consentDate: new Date(),
        consentMethod: ConsentMethod.EXPLICIT_OPT_IN,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
    ],
    lastConsentUpdate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    hasValidConsent: jest.fn(),
    getGrantedPurposes: jest.fn(),
    needsConsentRenewal: jest.fn(),
  };

  const mockConsentStatus: ConsentStatusDto = {
    userId: mockUserId,
    purposes: [
      {
        purpose: ConsentPurpose.MARKETING,
        status: ConsentStatus.GRANTED,
        grantedAt: new Date(),
        canWithdraw: true,
      },
      {
        purpose: ConsentPurpose.ANALYTICS,
        status: ConsentStatus.GRANTED,
        grantedAt: new Date(),
        canWithdraw: true,
      },
    ],
    needsRenewal: false,
    lastUpdated: new Date(),
  };

  const mockDataSubjectRightsRequest: DataSubjectRightsRequest = {
    id: 'request-789',
    userId: mockUserId,
    requestType: DataSubjectRightType.ACCESS,
    status: RequestStatus.PENDING,
    identityVerificationStatus: 'pending' as any,
    requestDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDataExportPackage: DataExportPackage = {
    id: 'export-123',
    requestId: 'request-789',
    userId: mockUserId,
    format: DataExportFormat.JSON,
    dataCategories: [
      {
        category: 'profile',
        description: 'User profile information',
        data: { name: 'Test User', email: 'test@example.com' },
        sources: ['user-service'],
        legalBasis: 'Consent',
        retentionPeriod: '2 years',
        collectionDate: new Date(),
      },
    ],
    metadata: {
      exportDate: new Date(),
      dataController: 'AI Recruitment Clerk',
      privacyPolicyVersion: '1.0',
      retentionPolicies: { profile: '2 years' },
      thirdPartyProcessors: ['Google Gemini AI'],
    },
    downloadUrl: 'https://example.com/download/export-123',
    createdAt: new Date(),
  } as DataExportPackage;

  beforeEach(() => {
    privacyService = {
      captureConsent: jest.fn(),
      withdrawConsent: jest.fn(),
      getConsentStatus: jest.fn(),
      createRightsRequest: jest.fn(),
      processDataAccessRequest: jest.fn(),
      processDataErasureRequest: jest.fn(),
    } as unknown as jest.Mocked<PrivacyComplianceService>;

    controller = new PrivacyComplianceController(privacyService as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /privacy/consent', () => {
    const captureConsentDto: CaptureConsentDto = {
      userId: mockUserId,
      consents: [
        {
          purpose: ConsentPurpose.MARKETING,
          granted: true,
          method: ConsentMethod.EXPLICIT_OPT_IN,
        },
      ],
    };

    it('should capture user consent successfully', async () => {
      // Arrange
      privacyService.captureConsent.mockResolvedValue(mockUserConsentProfile);

      // Act
      const result = await controller.captureConsent(captureConsentDto, mockRequest);

      // Assert
      expect(result.userId).toBe(mockUserId);
      expect(result.consentRecords).toHaveLength(1);
      expect(privacyService.captureConsent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
        }),
      );
    });

    it('should add request context (IP address and user agent)', async () => {
      // Arrange
      privacyService.captureConsent.mockResolvedValue(mockUserConsentProfile);

      // Act
      await controller.captureConsent(captureConsentDto, mockRequest);

      // Assert
      const capturedCall = (privacyService.captureConsent as jest.Mock).mock.calls[0][0];
      expect(capturedCall.ipAddress).toBe('127.0.0.1');
      expect(capturedCall.userAgent).toBe('Mozilla/5.0 (Test Browser)');
    });

    it('should handle consent with cookie preferences', async () => {
      // Arrange
      const consentWithCookies: CaptureConsentDto = {
        ...captureConsentDto,
        cookieConsent: {
          deviceId: mockDeviceId,
          functional: true,
          analytics: true,
          marketing: false,
        },
      };
      privacyService.captureConsent.mockResolvedValue(mockUserConsentProfile);

      // Act
      const result = await controller.captureConsent(consentWithCookies, mockRequest);

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw 400 Bad Request for invalid consent data', async () => {
      // Arrange
      const invalidConsent: CaptureConsentDto = {
        userId: mockUserId,
        consents: [],
      };
      privacyService.captureConsent.mockRejectedValue(new Error('Invalid consent data'));

      // Act & Assert
      await expect(controller.captureConsent(invalidConsent, mockRequest)).rejects.toThrow();
    });

    it('should throw 404 Not Found for non-existent user', async () => {
      // Arrange
      privacyService.captureConsent.mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(controller.captureConsent(captureConsentDto, mockRequest)).rejects.toThrow();
    });
  });

  describe('PUT /privacy/consent/withdraw', () => {
    const withdrawConsentDto: WithdrawConsentDto = {
      userId: mockUserId,
      purpose: ConsentPurpose.MARKETING,
      reason: 'No longer interested',
    };

    it('should withdraw consent successfully', async () => {
      // Arrange
      privacyService.withdrawConsent.mockResolvedValue(undefined);

      // Act
      await controller.withdrawConsent(withdrawConsentDto);

      // Assert
      expect(privacyService.withdrawConsent).toHaveBeenCalledWith(withdrawConsentDto);
    });

    it('should throw 400 Bad Request for invalid withdrawal', async () => {
      // Arrange
      privacyService.withdrawConsent.mockRejectedValue(new Error('Invalid withdrawal request'));

      // Act & Assert
      await expect(controller.withdrawConsent(withdrawConsentDto)).rejects.toThrow();
    });

    it('should throw 403 Forbidden for essential services consent withdrawal', async () => {
      // Arrange
      privacyService.withdrawConsent.mockRejectedValue(
        new Error('Cannot withdraw consent for essential services'),
      );

      // Act & Assert
      await expect(controller.withdrawConsent(withdrawConsentDto)).rejects.toThrow();
    });

    it('should throw 404 Not Found for non-existent user', async () => {
      // Arrange
      privacyService.withdrawConsent.mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(controller.withdrawConsent(withdrawConsentDto)).rejects.toThrow();
    });
  });

  describe('GET /privacy/consent/:userId', () => {
    it('should retrieve consent status successfully', async () => {
      // Arrange
      privacyService.getConsentStatus.mockResolvedValue(mockConsentStatus);

      // Act
      const result = await controller.getConsentStatus(mockUserId);

      // Assert
      expect(result.userId).toBe(mockUserId);
      expect(result.purposes).toHaveLength(2);
      expect(privacyService.getConsentStatus).toHaveBeenCalledWith(mockUserId);
    });

    it('should return empty purposes array when no consent records exist', async () => {
      // Arrange
      const emptyStatus: ConsentStatusDto = {
        userId: mockUserId,
        purposes: [],
        needsRenewal: true,
        lastUpdated: new Date(),
      };
      privacyService.getConsentStatus.mockResolvedValue(emptyStatus);

      // Act
      const result = await controller.getConsentStatus(mockUserId);

      // Assert
      expect(result.purposes).toHaveLength(0);
      expect(result.needsRenewal).toBe(true);
    });

    it('should throw 404 Not Found for non-existent user', async () => {
      // Arrange
      privacyService.getConsentStatus.mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(controller.getConsentStatus('non-existent-user')).rejects.toThrow();
    });
  });

  describe('POST /privacy/rights-request', () => {
    const createRightsRequestDto: CreateRightsRequestDto = {
      userId: mockUserId,
      requestType: DataSubjectRightType.ACCESS,
      description: 'Requesting all my personal data',
    };

    it('should create data subject rights request successfully', async () => {
      // Arrange
      privacyService.createRightsRequest.mockResolvedValue(mockDataSubjectRightsRequest);

      // Act
      const result = await controller.createRightsRequest(createRightsRequestDto, mockRequest);

      // Assert
      expect(result.id).toBe('request-789');
      expect(result.requestType).toBe(DataSubjectRightType.ACCESS);
      expect(result.status).toBe(RequestStatus.PENDING);
      expect(privacyService.createRightsRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
        }),
      );
    });

    it('should create erasure request (right to be forgotten)', async () => {
      // Arrange
      const erasureRequest: CreateRightsRequestDto = {
        userId: mockUserId,
        requestType: DataSubjectRightType.ERASURE,
        description: 'Please delete all my data',
      };
      const erasureResponse: DataSubjectRightsRequest = {
        ...mockDataSubjectRightsRequest,
        requestType: DataSubjectRightType.ERASURE,
      };
      privacyService.createRightsRequest.mockResolvedValue(erasureResponse);

      // Act
      const result = await controller.createRightsRequest(erasureRequest, mockRequest);

      // Assert
      expect(result.requestType).toBe(DataSubjectRightType.ERASURE);
    });

    it('should throw 400 Bad Request for invalid request data', async () => {
      // Arrange
      const invalidRequest: CreateRightsRequestDto = {
        userId: mockUserId,
        requestType: 'invalid_type' as DataSubjectRightType,
      };
      privacyService.createRightsRequest.mockRejectedValue(new Error('Invalid request type'));

      // Act & Assert
      await expect(
        controller.createRightsRequest(invalidRequest, mockRequest),
      ).rejects.toThrow();
    });
  });

  describe('GET /privacy/data-export/:userId', () => {
    it('should export user data in JSON format successfully', async () => {
      // Arrange
      privacyService.processDataAccessRequest.mockResolvedValue(mockDataExportPackage);

      // Act
      const result = await controller.exportUserData(mockUserId);

      // Assert
      expect(result.userId).toBe(mockUserId);
      expect(result.format).toBe(DataExportFormat.JSON);
      expect(result.dataCategories).toHaveLength(1);
      expect(result.downloadUrl).toBeDefined();
    });

    it('should export user data in CSV format when specified', async () => {
      // Arrange
      const csvExportPackage = { ...mockDataExportPackage, format: DataExportFormat.CSV };
      privacyService.processDataAccessRequest.mockResolvedValue(csvExportPackage);

      // Act
      const result = await controller.exportUserData(mockUserId, DataExportFormat.CSV);

      // Assert
      expect(result.format).toBe(DataExportFormat.CSV);
      expect(privacyService.processDataAccessRequest).toHaveBeenCalledWith(
        mockUserId,
        DataExportFormat.CSV,
      );
    });

    it('should export user data in PDF format when specified', async () => {
      // Arrange
      const pdfExportPackage = { ...mockDataExportPackage, format: DataExportFormat.PDF };
      privacyService.processDataAccessRequest.mockResolvedValue(pdfExportPackage);

      // Act
      const result = await controller.exportUserData(mockUserId, DataExportFormat.PDF);

      // Assert
      expect(result.format).toBe(DataExportFormat.PDF);
    });

    it('should default to JSON format when format not specified', async () => {
      // Arrange
      privacyService.processDataAccessRequest.mockResolvedValue(mockDataExportPackage);

      // Act
      await controller.exportUserData(mockUserId);

      // Assert
      expect(privacyService.processDataAccessRequest).toHaveBeenCalledWith(
        mockUserId,
        DataExportFormat.JSON,
      );
    });

    it('should throw 404 Not Found for non-existent user', async () => {
      // Arrange
      privacyService.processDataAccessRequest.mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(controller.exportUserData('non-existent-user')).rejects.toThrow();
    });

    it('should include metadata in export package', async () => {
      // Arrange
      privacyService.processDataAccessRequest.mockResolvedValue(mockDataExportPackage);

      // Act
      const result = await controller.exportUserData(mockUserId);

      // Assert
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.dataController).toBe('AI Recruitment Clerk');
      expect(result.metadata?.exportDate).toBeDefined();
      expect(result.metadata?.thirdPartyProcessors).toContain('Google Gemini AI');
    });
  });

  describe('DELETE /privacy/user-data/:userId', () => {
    it('should delete all user data successfully', async () => {
      // Arrange
      privacyService.processDataErasureRequest.mockResolvedValue(undefined);

      // Act
      await controller.deleteUserData(mockUserId);

      // Assert
      expect(privacyService.processDataErasureRequest).toHaveBeenCalledWith(mockUserId, undefined);
    });

    it('should delete specific data categories when specified', async () => {
      // Arrange
      privacyService.processDataErasureRequest.mockResolvedValue(undefined);

      // Act
      await controller.deleteUserData(mockUserId, 'marketing,analytics');

      // Assert
      expect(privacyService.processDataErasureRequest).toHaveBeenCalledWith(mockUserId, [
        'marketing',
        'analytics',
      ]);
    });

    it('should throw 403 Forbidden when data deletion not permitted due to legal obligations', async () => {
      // Arrange
      privacyService.processDataErasureRequest.mockRejectedValue(
        new ForbiddenException('Data deletion not permitted: active legal hold'),
      );

      // Act & Assert
      await expect(controller.deleteUserData(mockUserId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw 404 Not Found for non-existent user', async () => {
      // Arrange
      privacyService.processDataErasureRequest.mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(controller.deleteUserData('non-existent-user')).rejects.toThrow();
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      privacyService.processDataErasureRequest.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act & Assert
      await expect(controller.deleteUserData(mockUserId)).rejects.toThrow();
    });
  });

  describe('GET /privacy/processing-records', () => {
    it('should return data processing records (Article 30)', async () => {
      // Act
      const result = await controller.getProcessingRecords();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('purposes');
      expect(result[0]).toHaveProperty('legalBasis');
    });

    it('should include processing details in records', async () => {
      // Act
      const result = await controller.getProcessingRecords();

      // Assert
      result.forEach((record) => {
        expect(record).toHaveProperty('dataCategories');
        expect(record).toHaveProperty('retentionPeriod');
      });
    });
  });

  describe('GET /privacy/compliance-status', () => {
    it('should return GDPR compliance status', async () => {
      // Act
      const result = await controller.getComplianceStatus();

      // Assert
      expect(result).toHaveProperty('overallScore');
      expect(result.overallScore).toBe(85);
      expect(result).toHaveProperty('consentManagement');
      expect(result).toHaveProperty('dataSubjectRights');
      expect(result).toHaveProperty('dataRetention');
      expect(result).toHaveProperty('breachManagement');
    });

    it('should include consent management metrics', async () => {
      // Act
      const result = await controller.getComplianceStatus();

      // Assert
      expect(result.consentManagement).toMatchObject({
        score: expect.any(Number),
        activeConsents: expect.any(Number),
        withdrawnConsents: expect.any(Number),
        pendingRenewals: expect.any(Number),
      });
    });

    it('should include data subject rights metrics', async () => {
      // Act
      const result = await controller.getComplianceStatus();

      // Assert
      expect(result.dataSubjectRights).toMatchObject({
        score: expect.any(Number),
        activeRequests: expect.any(Number),
        completedRequests: expect.any(Number),
        averageCompletionDays: expect.any(Number),
      });
    });
  });

  describe('POST /privacy/privacy-health-check', () => {
    it('should perform privacy infrastructure health check', async () => {
      // Act
      const result = await controller.privacyHealthCheck();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('gdprCompliance');
    });

    it('should include check details for all systems', async () => {
      // Act
      const result = await controller.privacyHealthCheck();

      // Assert
      expect(result.checks).toMatchObject({
        consentStorage: expect.any(Object),
        rightsProcessing: expect.any(Object),
        dataRetention: expect.any(Object),
        encryption: expect.any(Object),
      });
    });

    it('should include GDPR compliance status', async () => {
      // Act
      const result = await controller.privacyHealthCheck();

      // Assert
      expect(result.gdprCompliance).toMatchObject({
        consentFramework: 'active',
        rightsAutomation: 'active',
        retentionPolicies: 'active',
        breachNotification: 'active',
      });
    });

    it('should return valid ISO timestamp', async () => {
      // Act
      const result = await controller.privacyHealthCheck();

      // Assert
      const timestamp = new Date(result.timestamp as string);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe('POST /privacy/cookie-consent', () => {
    const mockCookieConsent = {
      deviceId: mockDeviceId,
      preferences: {
        essential: true,
        functional: true,
        analytics: false,
        marketing: false,
      },
    };

    it('should set cookie consent preferences successfully', async () => {
      // Act
      const result = await controller.setCookieConsent(mockCookieConsent, mockRequest as any);

      // Assert
      expect(result.deviceId).toBe(mockDeviceId);
      expect(result).toHaveProperty('preferences');
      expect(result).toHaveProperty('consentDate');
      expect(result).toHaveProperty('expiryDate');
    });

    it('should set 1 year expiry date for cookie consent', async () => {
      // Act
      const result = await controller.setCookieConsent(mockCookieConsent, mockRequest as any);

      // Assert
      const consentDate = result.consentDate as Date;
      const expiryDate = result.expiryDate as Date;
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      expect(expiryDate.getTime() - consentDate.getTime()).toBeCloseTo(oneYearMs, -4);
    });
  });

  describe('GET /privacy/cookie-consent/:deviceId', () => {
    it('should retrieve cookie consent preferences', async () => {
      // Act
      const result = await controller.getCookieConsent(mockDeviceId);

      // Assert
      expect(result.deviceId).toBe(mockDeviceId);
      expect(result).toHaveProperty('essential');
      expect(result).toHaveProperty('functional');
      expect(result).toHaveProperty('analytics');
      expect(result).toHaveProperty('marketing');
      expect(result).toHaveProperty('consentDate');
      expect(result).toHaveProperty('needsUpdate');
    });

    it('should return default cookie consent settings', async () => {
      // Act
      const result = await controller.getCookieConsent(mockDeviceId);

      // Assert
      expect(result.essential).toBe(true);
      expect(result.functional).toBe(false);
      expect(result.analytics).toBe(false);
      expect(result.marketing).toBe(false);
      expect(result.needsUpdate).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailable errors', async () => {
      // Arrange
      privacyService.getConsentStatus.mockRejectedValue(new Error('Service temporarily unavailable'));

      // Act & Assert
      await expect(controller.getConsentStatus(mockUserId)).rejects.toThrow();
    });

    it('should handle database connection errors', async () => {
      // Arrange
      privacyService.createRightsRequest.mockRejectedValue(
        new Error('Database connection lost'),
      );

      // Act & Assert
      await expect(
        controller.createRightsRequest(
          { userId: mockUserId, requestType: DataSubjectRightType.ACCESS },
          mockRequest,
        ),
      ).rejects.toThrow();
    });
  });

  describe('Security', () => {
    it('should require authentication for protected endpoints', async () => {
      // Protected endpoints use @UseGuards(JwtAuthGuard) and @ApiBearerAuth
      expect(controller.withdrawConsent).toBeDefined();
      expect(controller.getConsentStatus).toBeDefined();
      expect(controller.createRightsRequest).toBeDefined();
      expect(controller.exportUserData).toBeDefined();
      expect(controller.deleteUserData).toBeDefined();
    });

    it('should not require authentication for public health check', async () => {
      // Health check should be accessible without auth
      const result = await controller.privacyHealthCheck();
      expect(result).toBeDefined();
      expect(result.status).toBe('healthy');
    });

    it('should not expose sensitive data in consent responses', async () => {
      // Arrange
      privacyService.getConsentStatus.mockResolvedValue(mockConsentStatus);

      // Act
      const result = await controller.getConsentStatus(mockUserId);

      // Assert
      expect(result).not.toHaveProperty('rawConsentData');
      expect(result).not.toHaveProperty('internalProcessingData');
    });
  });

  describe('Performance', () => {
    it('should complete consent status retrieval within performance budget', async () => {
      // Arrange
      privacyService.getConsentStatus.mockResolvedValue(mockConsentStatus);

      // Act
      const startTime = Date.now();
      await controller.getConsentStatus(mockUserId);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(200);
    });

    it('should complete data export request within performance budget', async () => {
      // Arrange
      privacyService.processDataAccessRequest.mockResolvedValue(mockDataExportPackage);

      // Act
      const startTime = Date.now();
      await controller.exportUserData(mockUserId);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(200);
    });
  });
});
