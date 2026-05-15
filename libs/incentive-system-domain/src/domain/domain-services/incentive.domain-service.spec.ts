import { IncentiveDomainService } from './incentive.domain-service';
import {
  Incentive,
  IncentiveStatus,
  PaymentMethod,
} from '../aggregates/incentive.aggregate';
import { ContactInfo } from '../value-objects/contact-info.value-object';
import type {
  IIncentiveRepository,
  IDomainEventBus,
  IAuditLogger,
  IPaymentGateway,
} from '../../application/dtos/incentive.dto';

describe('IncentiveDomainService', () => {
  let service: IncentiveDomainService;
  let mockRepository: jest.Mocked<IIncentiveRepository>;
  let mockEventBus: jest.Mocked<IDomainEventBus>;
  let mockAuditLogger: jest.Mocked<IAuditLogger>;
  let mockPaymentGateway: jest.Mocked<IPaymentGateway>;

  const mockContactInfo = new ContactInfo({
    wechat: 'test_wechat',
    phone: '13800138000',
    email: 'test@example.com',
  });

  const createMockIncentive = (overrides?: {
    status?: IncentiveStatus;
    rewardAmount?: number;
    qualityScore?: number;
  }): Incentive => {
    const incentive = Incentive.createQuestionnaireIncentive(
      '192.168.1.1',
      'questionnaire-123',
      // Use qualityScore < 70 to avoid auto-approval, unless specified otherwise
      overrides?.qualityScore ?? 60,
      mockContactInfo,
    );

    return incentive;
  };

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByIP: jest.fn(),
      findAll: jest.fn(),
      findPendingIncentives: jest.fn(),
      findReferralIncentive: jest.fn(),
      countTodayIncentives: jest.fn(),
      deleteExpired: jest.fn(),
    } as unknown as jest.Mocked<IIncentiveRepository>;

    mockEventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<IDomainEventBus>;

    mockAuditLogger = {
      logBusinessEvent: jest.fn(),
      logSecurityEvent: jest.fn(),
      logError: jest.fn(),
    } as unknown as jest.Mocked<IAuditLogger>;

    mockPaymentGateway = {
      processPayment: jest.fn(),
    } as unknown as jest.Mocked<IPaymentGateway>;

    service = new IncentiveDomainService(
      mockRepository,
      mockEventBus,
      mockAuditLogger,
      mockPaymentGateway,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create service with all dependencies', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createQuestionnaireIncentive', () => {
    it('should create incentive successfully', async () => {
      mockRepository.countTodayIncentives.mockResolvedValue(0);
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await service.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        mockContactInfo,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should reject when daily limit exceeded', async () => {
      mockRepository.countTodayIncentives.mockResolvedValue(3);

      const result = await service.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        mockContactInfo,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Daily incentive limit exceeded (max 3)');
    });

    it('should reject low quality score', async () => {
      mockRepository.countTodayIncentives.mockResolvedValue(0);

      const result = await service.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        30,
        mockContactInfo,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Quality score must be at least 50');
    });

    it('should reject invalid IP', async () => {
      mockRepository.countTodayIncentives.mockResolvedValue(0);

      const result = await service.createQuestionnaireIncentive(
        'invalid-ip',
        'questionnaire-123',
        85,
        mockContactInfo,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid IP address format');
    });

    it('should handle repository error', async () => {
      mockRepository.countTodayIncentives.mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        mockContactInfo,
      );

      expect(result.success).toBe(false);
    });
  });

  describe('createReferralIncentive', () => {
    it('should create referral incentive successfully', async () => {
      mockRepository.countTodayIncentives.mockResolvedValue(0);
      mockRepository.findReferralIncentive.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await service.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        mockContactInfo,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject duplicate referral', async () => {
      mockRepository.countTodayIncentives.mockResolvedValue(0);
      mockRepository.findReferralIncentive.mockResolvedValue(
        createMockIncentive(),
      );

      const result = await service.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        mockContactInfo,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Referral incentive already exists for this IP pair',
      );
    });

    it('should reject self-referral', async () => {
      mockRepository.countTodayIncentives.mockResolvedValue(0);

      const result = await service.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.1',
        mockContactInfo,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Cannot refer yourself');
    });

    it('should handle repository error', async () => {
      mockRepository.countTodayIncentives.mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        mockContactInfo,
      );

      expect(result.success).toBe(false);
    });
  });

  describe('validateIncentive', () => {
    it('should validate existing incentive', async () => {
      const incentive = createMockIncentive();
      mockRepository.findById.mockResolvedValue(incentive);
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await service.validateIncentive('incentive-123');

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(true);
    });

    it('should fail for non-existent incentive', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.validateIncentive('non-existent');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Incentive not found');
    });

    it('should handle repository error', async () => {
      mockRepository.findById.mockRejectedValue(new Error('DB error'));

      const result = await service.validateIncentive('incentive-123');

      expect(result.success).toBe(false);
    });
  });

  describe('approveIncentive', () => {
    it('should approve pending incentive', async () => {
      const incentive = createMockIncentive({
        status: IncentiveStatus.PENDING_VALIDATION,
      });
      mockRepository.findById.mockResolvedValue(incentive);
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await service.approveIncentive('incentive-123', 'Valid');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(IncentiveStatus.APPROVED);
    });

    it('should fail for non-existent incentive', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.approveIncentive('non-existent', 'Reason');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Incentive not found');
    });

    it('should handle repository error', async () => {
      mockRepository.findById.mockRejectedValue(new Error('DB error'));

      const result = await service.approveIncentive('incentive-123', 'Reason');

      expect(result.success).toBe(false);
    });
  });

  describe('rejectIncentive', () => {
    it('should reject pending incentive', async () => {
      const incentive = createMockIncentive({
        status: IncentiveStatus.PENDING_VALIDATION,
      });
      mockRepository.findById.mockResolvedValue(incentive);
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await service.rejectIncentive('incentive-123', 'Fraud');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(IncentiveStatus.REJECTED);
    });

    it('should fail for non-existent incentive', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.rejectIncentive('non-existent', 'Reason');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Incentive not found');
    });

    it('should handle repository error', async () => {
      mockRepository.findById.mockRejectedValue(new Error('DB error'));

      const result = await service.rejectIncentive('incentive-123', 'Reason');

      expect(result.success).toBe(false);
    });
});

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const incentive = createMockIncentive({ qualityScore: 85 });
      // Incentive is auto-approved due to qualityScore >= 70
      mockRepository.findById.mockResolvedValue(incentive);
      mockPaymentGateway.processPayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-123',
      });
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await service.processPayment(
        'incentive-123',
        PaymentMethod.WECHAT_PAY,
      );

      expect(result.success).toBe(true);
      expect(result.data?.transactionId).toBe('txn-123');
    });

    it('should fail for non-approved incentive', async () => {
      const incentive = createMockIncentive();
      // Default qualityScore of 60 results in PENDING_VALIDATION status
      mockRepository.findById.mockResolvedValue(incentive);

      const result = await service.processPayment(
        'incentive-123',
        PaymentMethod.WECHAT_PAY,
      );

      expect(result.success).toBe(false);
    });

    it('should fail for non-existent incentive', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.processPayment(
        'non-existent',
        PaymentMethod.WECHAT_PAY,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Incentive not found');
    });

    it('should fail when payment gateway fails', async () => {
      const incentive = createMockIncentive({
        status: IncentiveStatus.APPROVED,
      });
      mockRepository.findById.mockResolvedValue(incentive);
      mockPaymentGateway.processPayment.mockResolvedValue({
        success: false,
        transactionId: '',
        error: 'Gateway error',
      });

      const result = await service.processPayment(
        'incentive-123',
        PaymentMethod.WECHAT_PAY,
      );

      expect(result.success).toBe(false);
    });

    it('should handle repository error', async () => {
      mockRepository.findById.mockRejectedValue(new Error('DB error'));

      const result = await service.processPayment(
        'incentive-123',
        PaymentMethod.WECHAT_PAY,
      );

      expect(result.success).toBe(false);
    });
  });

  describe('processBatchPayment', () => {
it('should process batch payment successfully', async () => {
const incentives = [
createMockIncentive({ qualityScore: 85 }),
createMockIncentive({ qualityScore: 85 }),
];
      // Incentives are auto-approved due to qualityScore >= 70
      mockRepository.findByIds.mockResolvedValue(incentives);
mockPaymentGateway.processPayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-123',
      });
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await service.processBatchPayment(
        ['incentive-1', 'incentive-2'],
        PaymentMethod.WECHAT_PAY,
      );

      expect(result.success).toBe(true);
      expect(result.data?.successCount).toBe(2);
    });

    it('should fail for empty incentive list', async () => {
      mockRepository.findByIds.mockResolvedValue([]);

      const result = await service.processBatchPayment(
        ['non-existent'],
        PaymentMethod.WECHAT_PAY,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No valid incentives found');
    });

    it('should fail for batch exceeding limit', async () => {
      const incentives = Array(101)
        .fill(null)
        .map(() => createMockIncentive({ qualityScore: 85 }));
      // Incentives are auto-approved due to qualityScore >= 70
      mockRepository.findByIds.mockResolvedValue(incentives);

      const result = await service.processBatchPayment(
        Array(101).fill('incentive-id'),
        PaymentMethod.WECHAT_PAY,
      );

      expect(result.success).toBe(false);
    });

    it('should handle repository error', async () => {
      mockRepository.findByIds.mockRejectedValue(new Error('DB error'));

      const result = await service.processBatchPayment(
        ['incentive-1'],
        PaymentMethod.WECHAT_PAY,
      );

      expect(result.success).toBe(false);
    });
  });

  describe('getIncentiveStatistics', () => {
    it('should get statistics for specific IP', async () => {
      const incentives = [createMockIncentive()];
      mockRepository.findByIP.mockResolvedValue(incentives);

      const result = await service.getIncentiveStatistics('192.168.1.1');

      expect(result.success).toBe(true);
      expect(result.data?.individual).toBeDefined();
    });

    it('should get system statistics when no IP provided', async () => {
      mockRepository.findAll.mockResolvedValue([createMockIncentive()]);

      const result = await service.getIncentiveStatistics();

      expect(result.success).toBe(true);
      expect(result.data?.system).toBeDefined();
    });

    it('should fail for invalid IP format', async () => {
      const result = await service.getIncentiveStatistics('invalid-ip');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid IP address format');
    });

    it('should handle repository error', async () => {
      mockRepository.findByIP.mockRejectedValue(new Error('DB error'));

      const result = await service.getIncentiveStatistics('192.168.1.1');

      expect(result.success).toBe(false);
    });
  });

  describe('getPendingIncentives', () => {
    it('should return pending incentives with priorities', async () => {
      const incentives = [createMockIncentive()];
      mockRepository.findPendingIncentives.mockResolvedValue(incentives);

      const result = await service.getPendingIncentives();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBe(1);
    });

    it('should filter by status', async () => {
      mockRepository.findPendingIncentives.mockResolvedValue([]);

      await service.getPendingIncentives(IncentiveStatus.APPROVED);

      expect(mockRepository.findPendingIncentives).toHaveBeenCalledWith(
        IncentiveStatus.APPROVED,
        50,
      );
    });

    it('should handle repository error', async () => {
      mockRepository.findPendingIncentives.mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.getPendingIncentives();

      expect(result.success).toBe(false);
    });
  });
});
