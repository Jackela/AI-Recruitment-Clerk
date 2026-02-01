import {
  IncentiveDomainService,
  IncentiveCreationResult,
  PaymentProcessingResult,
  IIncentiveRepository,
  IDomainEventBus,
  IAuditLogger,
  IPaymentGateway,
} from './incentive.service';
import {
  Incentive,
  IncentiveStatus,
  PaymentMethod,
  ContactInfo,
  Currency,
} from './incentive.dto';

describe('IncentiveDomainService', () => {
  let service: IncentiveDomainService;
  let mockRepository: jest.Mocked<IIncentiveRepository>;
  let mockEventBus: jest.Mocked<IDomainEventBus>;
  let mockAuditLogger: jest.Mocked<IAuditLogger>;
  let mockPaymentGateway: jest.Mocked<IPaymentGateway>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByIP: jest.fn(),
      findAll: jest.fn(),
      findPendingIncentives: jest.fn(),
      findReferralIncentive: jest.fn(),
      countTodayIncentives: jest.fn(),
      deleteExpired: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    mockAuditLogger = {
      logBusinessEvent: jest.fn().mockResolvedValue(undefined),
      logSecurityEvent: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    };

    mockPaymentGateway = {
      processPayment: jest.fn(),
    };

    service = new IncentiveDomainService(
      mockRepository,
      mockEventBus,
      mockAuditLogger,
      mockPaymentGateway,
    );
  });

  describe('createQuestionnaireIncentive', () => {
    const validIP = '192.168.1.1';
    const questionnaireId = 'quest_123';
    const qualityScore = 85;
    const contactInfo = new ContactInfo({
      email: 'test@example.com',
      wechat: 'test_wechat',
    });

    it('should create incentive successfully for high quality submission', async () => {
      mockRepository.countTodayIncentives.mockResolvedValue(0);

      const result = await service.createQuestionnaireIncentive(
        validIP,
        questionnaireId,
        qualityScore,
        contactInfo,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.rewardAmount).toBeGreaterThan(0);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'INCENTIVE_CREATED',
        expect.any(Object),
      );
    });

    it('should deny creation when daily limit is reached', async () => {
      mockRepository.countTodayIncentives.mockResolvedValue(3);

      const result = await service.createQuestionnaireIncentive(
        validIP,
        questionnaireId,
        qualityScore,
        contactInfo,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'INCENTIVE_CREATION_DENIED',
        expect.any(Object),
      );
    });

    it('should deny creation for low quality score', async () => {
      mockRepository.countTodayIncentives.mockResolvedValue(0);

      const result = await service.createQuestionnaireIncentive(
        validIP,
        questionnaireId,
        30, // Low score
        contactInfo,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Quality score must be at least'));
    });

    it('should handle repository errors gracefully', async () => {
      mockRepository.countTodayIncentives.mockRejectedValue(new Error('Database error'));

      const result = await service.createQuestionnaireIncentive(
        validIP,
        questionnaireId,
        qualityScore,
        contactInfo,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Internal error occurred while creating incentive');
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });

    it('should publish domain events on successful creation', async () => {
      mockRepository.countTodayIncentives.mockResolvedValue(0);

      await service.createQuestionnaireIncentive(
        validIP,
        questionnaireId,
        qualityScore,
        contactInfo,
      );

      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('createReferralIncentive', () => {
    const referrerIP = '192.168.1.1';
    const referredIP = '192.168.1.2';
    const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

    it('should create referral incentive successfully', async () => {
      mockRepository.countTodayIncentives.mockResolvedValue(0);
      mockRepository.findReferralIncentive.mockResolvedValue(null);

      const result = await service.createReferralIncentive(
        referrerIP,
        referredIP,
        contactInfo,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'REFERRAL_INCENTIVE_CREATED',
        expect.any(Object),
      );
    });

    it('should deny duplicate referral incentive', async () => {
      mockRepository.countTodayIncentives.mockResolvedValue(0);
      const existingIncentive = Incentive.createReferralIncentive(
        referrerIP,
        referredIP,
        contactInfo,
      );
      mockRepository.findReferralIncentive.mockResolvedValue(existingIncentive);

      const result = await service.createReferralIncentive(
        referrerIP,
        referredIP,
        contactInfo,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Referral incentive already exists for this IP pair');
    });

    it('should handle errors during referral creation', async () => {
      mockRepository.countTodayIncentives.mockRejectedValue(new Error('DB error'));

      const result = await service.createReferralIncentive(
        referrerIP,
        referredIP,
        contactInfo,
      );

      expect(result.success).toBe(false);
      expect(mockAuditLogger.logError).toHaveBeenCalledWith(
        'CREATE_REFERRAL_INCENTIVE_ERROR',
        expect.any(Object),
      );
    });
  });

  describe('validateIncentive', () => {
    it('should validate existing incentive successfully', async () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        new ContactInfo({ email: 'test@example.com' }),
      );
      mockRepository.findById.mockResolvedValue(incentive);

      const result = await service.validateIncentive('incentive_123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'INCENTIVE_VALIDATED',
        expect.any(Object),
      );
    });

    it('should fail when incentive not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.validateIncentive('nonexistent_id');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Incentive not found');
    });

    it('should handle validation errors gracefully', async () => {
      mockRepository.findById.mockRejectedValue(new Error('Database error'));

      const result = await service.validateIncentive('incentive_123');

      expect(result.success).toBe(false);
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });
  });

  describe('approveIncentive', () => {
    it('should approve pending incentive', async () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        55, // Low score - won't auto-approve
        new ContactInfo({ email: 'test@example.com' }),
      );
      mockRepository.findById.mockResolvedValue(incentive);

      const result = await service.approveIncentive('incentive_123', 'Manual approval');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(IncentiveStatus.APPROVED);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'INCENTIVE_APPROVED',
        expect.any(Object),
      );
    });

    it('should fail when incentive not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.approveIncentive('nonexistent', 'reason');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Incentive not found');
    });

    it('should handle approval errors', async () => {
      mockRepository.findById.mockRejectedValue(new Error('DB error'));

      const result = await service.approveIncentive('incentive_123', 'reason');

      expect(result.success).toBe(false);
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });
  });

  describe('rejectIncentive', () => {
    it('should reject pending incentive', async () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        55,
        new ContactInfo({ email: 'test@example.com' }),
      );
      mockRepository.findById.mockResolvedValue(incentive);

      const result = await service.rejectIncentive('incentive_123', 'Fraud detected');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(IncentiveStatus.REJECTED);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'INCENTIVE_REJECTED',
        expect.any(Object),
      );
    });

    it('should fail when incentive not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.rejectIncentive('nonexistent', 'reason');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Incentive not found');
    });
  });

  describe('processPayment', () => {
    it('should process payment successfully for approved incentive', async () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        new ContactInfo({ wechat: 'test_wechat' }),
      );
      mockRepository.findById.mockResolvedValue(incentive);
      mockPaymentGateway.processPayment.mockResolvedValue({
        success: true,
        transactionId: 'txn_123',
      });

      const result = await service.processPayment(
        'incentive_123',
        PaymentMethod.WECHAT_PAY,
      );

      expect(result.success).toBe(true);
      expect(result.data?.transactionId).toBe('txn_123');
      expect(mockPaymentGateway.processPayment).toHaveBeenCalled();
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'INCENTIVE_PAID',
        expect.any(Object),
      );
    });

    it('should fail when incentive not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.processPayment('nonexistent', PaymentMethod.WECHAT_PAY);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Incentive not found');
    });

    it('should handle payment gateway errors', async () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        new ContactInfo({ wechat: 'test_wechat' }),
      );
      mockRepository.findById.mockResolvedValue(incentive);
      mockPaymentGateway.processPayment.mockRejectedValue(new Error('Gateway error'));

      const result = await service.processPayment('incentive_123', PaymentMethod.WECHAT_PAY);

      expect(result.success).toBe(false);
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });
  });

  describe('processBatchPayment', () => {
    it('should process batch payments successfully', async () => {
      const incentive1 = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_1',
        85,
        new ContactInfo({ wechat: 'test1' }),
      );
      const incentive2 = Incentive.createQuestionnaireIncentive(
        '192.168.1.2',
        'quest_2',
        85,
        new ContactInfo({ wechat: 'test2' }),
      );

      mockRepository.findByIds.mockResolvedValue([incentive1, incentive2]);
      mockPaymentGateway.processPayment.mockResolvedValue({
        success: true,
        transactionId: 'txn_batch',
      });

      const result = await service.processBatchPayment(
        ['inc_1', 'inc_2'],
        PaymentMethod.WECHAT_PAY,
      );

      expect(result.success).toBe(true);
      expect(result.data?.successCount).toBe(2);
      expect(result.data?.failureCount).toBe(0);
      expect(mockPaymentGateway.processPayment).toHaveBeenCalledTimes(2);
    });

    it('should handle partial batch failures', async () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_1',
        85,
        new ContactInfo({ wechat: 'test' }),
      );

      mockRepository.findByIds.mockResolvedValue([incentive]);
      mockPaymentGateway.processPayment
        .mockResolvedValueOnce({ success: true, transactionId: 'txn_1' })
        .mockRejectedValueOnce(new Error('Payment failed'));

      const result = await service.processBatchPayment(
        ['inc_1'],
        PaymentMethod.WECHAT_PAY,
      );

      expect(result.success).toBe(true);
      expect(result.data?.results).toBeDefined();
    });

    it('should fail when no valid incentives found', async () => {
      mockRepository.findByIds.mockResolvedValue([]);

      const result = await service.processBatchPayment([], PaymentMethod.WECHAT_PAY);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No valid incentives found');
    });
  });

  describe('getIncentiveStatistics', () => {
    it('should get statistics for specific IP', async () => {
      const incentives = [
        Incentive.createQuestionnaireIncentive(
          '192.168.1.1',
          'quest_1',
          85,
          new ContactInfo({ wechat: 'test' }),
        ),
      ];
      mockRepository.findByIP.mockResolvedValue(incentives);

      const result = await service.getIncentiveStatistics('192.168.1.1');

      expect(result.success).toBe(true);
      expect(result.data?.individual).toBeDefined();
      expect(result.data?.individual?.ip).toBe('192.168.1.1');
    });

    it('should get system-wide statistics when no IP provided', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const result = await service.getIncentiveStatistics();

      expect(result.success).toBe(true);
      expect(result.data?.system).toBeDefined();
    });

    it('should fail for invalid IP address', async () => {
      const result = await service.getIncentiveStatistics('invalid-ip');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid IP address format');
    });

    it('should handle errors gracefully', async () => {
      mockRepository.findByIP.mockRejectedValue(new Error('DB error'));

      const result = await service.getIncentiveStatistics('192.168.1.1');

      expect(result.success).toBe(false);
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });
  });

  describe('getPendingIncentives', () => {
    it('should get pending incentives sorted by priority', async () => {
      const incentives = [
        Incentive.createQuestionnaireIncentive(
          '192.168.1.1',
          'quest_1',
          85,
          new ContactInfo({ wechat: 'test' }),
        ),
      ];
      mockRepository.findPendingIncentives.mockResolvedValue(incentives);

      const result = await service.getPendingIncentives();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle errors during retrieval', async () => {
      mockRepository.findPendingIncentives.mockRejectedValue(new Error('DB error'));

      const result = await service.getPendingIncentives();

      expect(result.success).toBe(false);
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });

    it('should respect limit parameter', async () => {
      mockRepository.findPendingIncentives.mockResolvedValue([]);

      await service.getPendingIncentives(IncentiveStatus.APPROVED, 10);

      expect(mockRepository.findPendingIncentives).toHaveBeenCalledWith(
        IncentiveStatus.APPROVED,
        10,
      );
    });
  });

  describe('Result Classes', () => {
    it('should create successful IncentiveCreationResult', () => {
      const summary = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_1',
        85,
        new ContactInfo({ wechat: 'test' }),
      ).getIncentiveSummary();

      const result = IncentiveCreationResult.success(summary);

      expect(result.success).toBe(true);
      expect(result.data).toBe(summary);
      expect(result.errors).toBeUndefined();
    });

    it('should create failed IncentiveCreationResult', () => {
      const result = IncentiveCreationResult.failed(['Error 1', 'Error 2']);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toEqual(['Error 1', 'Error 2']);
    });

    it('should create successful PaymentProcessingResult', () => {
      const result = PaymentProcessingResult.success({
        incentiveId: 'inc_1',
        transactionId: 'txn_1',
        amount: 8,
        currency: Currency.CNY,
        paymentMethod: PaymentMethod.WECHAT_PAY,
        status: IncentiveStatus.PAID,
      });

      expect(result.success).toBe(true);
      expect(result.data?.transactionId).toBe('txn_1');
    });
  });
});
