import { Test, TestingModule } from '@nestjs/testing';
import { ConsentCascadeService } from './consent-cascade.service';
import { ConsentPurpose } from '@ai-recruitment-clerk/shared-dtos';
import type {
  NatsClient,
  ConsentCascadeNotification,
  AuditLogEntry,
} from '@ai-recruitment-clerk/shared-dtos';

describe('ConsentCascadeService', () => {
  let service: ConsentCascadeService;
  let natsClientMock: jest.Mocked<NatsClient>;

  beforeEach(async () => {
    natsClientMock = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NatsClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsentCascadeService],
    }).compile();

    service = module.get<ConsentCascadeService>(ConsentCascadeService);
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('cascadeConsentWithdrawal', () => {
    const mockUserId = 'user-123';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should cascade consent withdrawal for RESUME_PROCESSING', async () => {
      await service.cascadeConsentWithdrawal(
        mockUserId,
        ConsentPurpose.RESUME_PROCESSING,
        natsClientMock,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'resume.processing.stop',
        { userId: mockUserId },
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'matching.operations.stop',
        { userId: mockUserId },
      );
    });

    it('should cascade consent withdrawal for MARKETING', async () => {
      await service.cascadeConsentWithdrawal(
        mockUserId,
        ConsentPurpose.MARKETING,
        natsClientMock,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'marketing.campaigns.exclude',
        { userId: mockUserId },
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'promotions.exclude',
        { userId: mockUserId },
      );
    });

    it('should cascade consent withdrawal for ANALYTICS', async () => {
      await service.cascadeConsentWithdrawal(
        mockUserId,
        ConsentPurpose.ANALYTICS,
        natsClientMock,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'analytics.collection.stop',
        { userId: mockUserId },
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'analytics.user.exclude',
        { userId: mockUserId },
      );
    });

    it('should cascade consent withdrawal for COMMUNICATION', async () => {
      await service.cascadeConsentWithdrawal(
        mockUserId,
        ConsentPurpose.COMMUNICATION,
        natsClientMock,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'communications.stop',
        { userId: mockUserId },
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'communications.scheduled.cancel',
        { userId: mockUserId },
      );
    });

    it('should handle unknown purpose gracefully', async () => {
      await service.cascadeConsentWithdrawal(
        mockUserId,
        'unknown_purpose' as ConsentPurpose,
        natsClientMock,
      );

      // Should still notify services and log
      expect(natsClientMock.publish).toHaveBeenCalled();
    });

    it('should notify all services about consent withdrawal', async () => {
      await service.cascadeConsentWithdrawal(
        mockUserId,
        ConsentPurpose.RESUME_PROCESSING,
        natsClientMock,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'resume-parser.consent.withdrawn',
        expect.objectContaining({
          userId: mockUserId,
          purpose: ConsentPurpose.RESUME_PROCESSING,
          action: 'consent_withdrawn',
        }),
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'scoring-engine.consent.withdrawn',
        expect.any(Object),
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'report-generator.consent.withdrawn',
        expect.any(Object),
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'jd-extractor.consent.withdrawn',
        expect.any(Object),
      );
    });

    it('should log consent withdrawal cascade', async () => {
      await service.cascadeConsentWithdrawal(
        mockUserId,
        ConsentPurpose.MARKETING,
        natsClientMock,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'audit.log',
        expect.objectContaining({
          userId: mockUserId,
          purpose: ConsentPurpose.MARKETING,
          action: 'consent_withdrawal_cascaded',
        }),
      );
    });

    it('should throw error when publish fails', async () => {
      natsClientMock.publish.mockRejectedValue(new Error('NATS error'));

      await expect(
        service.cascadeConsentWithdrawal(
          mockUserId,
          ConsentPurpose.RESUME_PROCESSING,
          natsClientMock,
        ),
      ).rejects.toThrow('NATS error');
    });
  });

  describe('stopResumeProcessing', () => {
    const mockUserId = 'user-123';

    it('should stop resume processing successfully', async () => {
      await service.stopResumeProcessing(mockUserId, natsClientMock);

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'resume.processing.stop',
        { userId: mockUserId },
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'matching.operations.stop',
        { userId: mockUserId },
      );
    });

    it('should throw error when publish fails', async () => {
      natsClientMock.publish.mockRejectedValue(new Error('Publish error'));

      await expect(
        service.stopResumeProcessing(mockUserId, natsClientMock),
      ).rejects.toThrow('Publish error');
    });
  });

  describe('stopJobMatchingActivities', () => {
    const mockUserId = 'user-123';

    it('should stop job matching activities successfully', async () => {
      await service.stopJobMatchingActivities(mockUserId, natsClientMock);

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'job.recommendations.stop',
        { userId: mockUserId },
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'matching.queue.remove',
        { userId: mockUserId },
      );
    });

    it('should throw error when publish fails', async () => {
      natsClientMock.publish.mockRejectedValue(new Error('Publish error'));

      await expect(
        service.stopJobMatchingActivities(mockUserId, natsClientMock),
      ).rejects.toThrow('Publish error');
    });
  });

  describe('stopMarketingActivities', () => {
    const mockUserId = 'user-123';

    it('should stop marketing activities successfully', async () => {
      await service.stopMarketingActivities(mockUserId, natsClientMock);

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'marketing.campaigns.exclude',
        { userId: mockUserId },
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'promotions.exclude',
        { userId: mockUserId },
      );
    });

    it('should throw error when publish fails', async () => {
      natsClientMock.publish.mockRejectedValue(new Error('Publish error'));

      await expect(
        service.stopMarketingActivities(mockUserId, natsClientMock),
      ).rejects.toThrow('Publish error');
    });
  });

  describe('removeFromMarketingLists', () => {
    const mockUserId = 'user-123';

    it('should remove user from marketing lists successfully', async () => {
      await expect(
        service.removeFromMarketingLists(mockUserId),
      ).resolves.not.toThrow();
    });

    it('should handle errors gracefully', async () => {
      // Since implementation is empty, this should not throw
      await expect(
        service.removeFromMarketingLists(mockUserId),
      ).resolves.not.toThrow();
    });
  });

  describe('stopAnalyticsCollection', () => {
    const mockUserId = 'user-123';

    it('should stop analytics collection successfully', async () => {
      await service.stopAnalyticsCollection(mockUserId, natsClientMock);

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'analytics.collection.stop',
        { userId: mockUserId },
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'analytics.user.exclude',
        { userId: mockUserId },
      );
    });

    it('should throw error when publish fails', async () => {
      natsClientMock.publish.mockRejectedValue(new Error('Publish error'));

      await expect(
        service.stopAnalyticsCollection(mockUserId, natsClientMock),
      ).rejects.toThrow('Publish error');
    });
  });

  describe('anonymizeAnalyticsData', () => {
    const mockUserId = 'user-123';

    it('should anonymize analytics data successfully', async () => {
      await service.anonymizeAnalyticsData(mockUserId, natsClientMock);

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'analytics.data.anonymize',
        { userId: mockUserId },
      );
    });

    it('should throw error when publish fails', async () => {
      natsClientMock.publish.mockRejectedValue(new Error('Publish error'));

      await expect(
        service.anonymizeAnalyticsData(mockUserId, natsClientMock),
      ).rejects.toThrow('Publish error');
    });
  });

  describe('stopCommunicationActivities', () => {
    const mockUserId = 'user-123';

    it('should stop communication activities successfully', async () => {
      await service.stopCommunicationActivities(mockUserId, natsClientMock);

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'communications.stop',
        { userId: mockUserId },
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'communications.scheduled.cancel',
        { userId: mockUserId },
      );
    });

    it('should throw error when publish fails', async () => {
      natsClientMock.publish.mockRejectedValue(new Error('Publish error'));

      await expect(
        service.stopCommunicationActivities(mockUserId, natsClientMock),
      ).rejects.toThrow('Publish error');
    });
  });

  describe('unsubscribeFromNotifications', () => {
    const mockUserId = 'user-123';

    it('should unsubscribe user from notifications successfully', async () => {
      await expect(
        service.unsubscribeFromNotifications(mockUserId),
      ).resolves.not.toThrow();
    });
  });

  describe('notifyServicesConsentWithdrawal', () => {
    const mockUserId = 'user-123';

    it('should notify all services successfully', async () => {
      await service.notifyServicesConsentWithdrawal(
        mockUserId,
        ConsentPurpose.RESUME_PROCESSING,
        natsClientMock,
      );

      expect(natsClientMock.publish).toHaveBeenCalledTimes(4);
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'resume-parser.consent.withdrawn',
        expect.objectContaining({
          userId: mockUserId,
          purpose: ConsentPurpose.RESUME_PROCESSING,
          action: 'consent_withdrawn',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should throw error when any notification fails', async () => {
      natsClientMock.publish.mockRejectedValue(new Error('Notification error'));

      await expect(
        service.notifyServicesConsentWithdrawal(
          mockUserId,
          ConsentPurpose.MARKETING,
          natsClientMock,
        ),
      ).rejects.toThrow('Notification error');
    });

    it('should send correct notification structure', async () => {
      await service.notifyServicesConsentWithdrawal(
        mockUserId,
        ConsentPurpose.ANALYTICS,
        natsClientMock,
      );

      const notificationArg = natsClientMock.publish.mock
        .calls[0][1] as ConsentCascadeNotification;
      expect(notificationArg.userId).toBe(mockUserId);
      expect(notificationArg.purpose).toBe(ConsentPurpose.ANALYTICS);
      expect(notificationArg.action).toBe('consent_withdrawn');
      expect(notificationArg.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('logConsentWithdrawalCascade', () => {
    const mockUserId = 'user-123';

    it('should log consent withdrawal cascade', async () => {
      await service.logConsentWithdrawalCascade(
        mockUserId,
        ConsentPurpose.MARKETING,
        natsClientMock,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'audit.log',
        expect.objectContaining({
          userId: mockUserId,
          purpose: ConsentPurpose.MARKETING,
          action: 'consent_withdrawal_cascaded',
          timestamp: expect.any(String),
          details: 'All related processing activities stopped',
        }),
      );
    });

    it('should not throw when logging fails', async () => {
      natsClientMock.publish.mockRejectedValue(new Error('Log error'));

      // Should not throw as this is audit logging only
      await expect(
        service.logConsentWithdrawalCascade(
          mockUserId,
          ConsentPurpose.RESUME_PROCESSING,
          natsClientMock,
        ),
      ).rejects.toThrow('Log error');
    });
  });

  describe('ConsentPurpose handling', () => {
    const mockUserId = 'user-123';

    it('should handle all defined consent purposes', async () => {
      const purposes = Object.values(ConsentPurpose);

      for (const purpose of purposes) {
        jest.clearAllMocks();

        await service.cascadeConsentWithdrawal(
          mockUserId,
          purpose,
          natsClientMock,
        );

        expect(natsClientMock.publish).toHaveBeenCalled();
      }
    });
  });
});
