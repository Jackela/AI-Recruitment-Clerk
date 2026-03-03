import { IncentiveIntegrationService } from './incentive-integration.service';
import type { ContactInfoData } from '@ai-recruitment-clerk/shared-dtos';
import type {
  BusinessValue,
  IncentiveMetadata,
  GetIncentivesOptions,
  ApprovalData,
  PaymentOptions,
  RulesConfig,
  ExportOptions,
} from './incentive-integration.service';

// Helper to create valid contact info
const createContactInfo = (): ContactInfoData => ({
  email: 'john.doe@example.com',
  phone: '+1234567890',
  wechat: 'wechat_id_123',
  alipay: 'alipay_account',
});

// Helper to create business value
const createBusinessValue = (): BusinessValue => ({
  category: 'survey',
  estimatedValue: 50,
  qualityMetrics: { completionRate: 100, accuracy: 95 },
  tags: ['premium', 'verified'],
});

// Helper to create metadata
const createMetadata = (): IncentiveMetadata => ({
  source: 'web-form',
  campaignId: 'campaign-123',
  referrerId: 'referrer-456',
  notes: 'Test incentive',
  organizationId: 'org-789',
});

describe('IncentiveIntegrationService', () => {
  let service: IncentiveIntegrationService;
  let originalGlobalDate: DateConstructor;

  beforeEach(() => {
    service = new IncentiveIntegrationService();
    originalGlobalDate = global.Date;
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Ensure global Date is restored after each test
    if (global.Date !== originalGlobalDate) {
      global.Date = originalGlobalDate;
    }
    jest.restoreAllMocks();
  });

  // ============================================================================
  // createQuestionnaireIncentive
  // ============================================================================
  describe('createQuestionnaireIncentive', () => {
    it('should create a questionnaire incentive with all parameters', async () => {
      const contactInfo = createContactInfo();
      const businessValue = createBusinessValue();
      const metadata = createMetadata();

      const result = await service.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        contactInfo,
        businessValue,
        'cash',
        metadata,
      );

      expect(result).toMatchObject({
        type: 'questionnaire',
        userIP: '192.168.1.1',
        questionnaireId: 'questionnaire-123',
        qualityScore: 85,
        contactInfo,
        businessValue,
        incentiveType: 'cash',
        status: 'pending',
      });
      expect(result.id).toMatch(/^incentive_\d+$/);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.metadata).toEqual(metadata);
    });

    it('should create a questionnaire incentive without optional metadata', async () => {
      const contactInfo = createContactInfo();
      const businessValue = createBusinessValue();

      const result = await service.createQuestionnaireIncentive(
        '10.0.0.1',
        'questionnaire-456',
        75,
        contactInfo,
        businessValue,
        'points',
      );

      expect(result).toMatchObject({
        type: 'questionnaire',
        userIP: '10.0.0.1',
        questionnaireId: 'questionnaire-456',
        qualityScore: 75,
        incentiveType: 'points',
        status: 'pending',
      });
      expect(result.metadata).toBeUndefined();
    });

    it('should create incentive with minimum quality score (0)', async () => {
      const result = await service.createQuestionnaireIncentive(
        '127.0.0.1',
        'questionnaire-min',
        0,
        createContactInfo(),
        {},
        'voucher',
      );

      expect(result.qualityScore).toBe(0);
    });

    it('should create incentive with maximum quality score (100)', async () => {
      const result = await service.createQuestionnaireIncentive(
        '127.0.0.1',
        'questionnaire-max',
        100,
        createContactInfo(),
        createBusinessValue(),
        'cash',
      );

      expect(result.qualityScore).toBe(100);
    });

    it('should handle empty business value', async () => {
      const result = await service.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-empty',
        50,
        createContactInfo(),
        {},
        'points',
      );

      expect(result.businessValue).toEqual({});
    });

    it('should handle empty contact info', async () => {
      const result = await service.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-no-contact',
        50,
        {} as ContactInfoData,
        createBusinessValue(),
        'cash',
      );

      expect(result.contactInfo).toEqual({});
    });
  });

  // ============================================================================
  // createReferralIncentive
  // ============================================================================
  describe('createReferralIncentive', () => {
    it('should create a referral incentive with all parameters', async () => {
      const contactInfo = createContactInfo();
      const metadata = createMetadata();

      const result = await service.createReferralIncentive(
        '192.168.1.100',
        '192.168.1.200',
        contactInfo,
        'direct',
        25.5,
        metadata,
      );

      expect(result).toMatchObject({
        type: 'referral',
        referrerIP: '192.168.1.100',
        referredIP: '192.168.1.200',
        contactInfo,
        referralType: 'direct',
        expectedValue: 25.5,
        status: 'pending',
      });
      expect(result.id).toMatch(/^referral_\d+$/);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.metadata).toEqual(metadata);
    });

    it('should create a referral incentive without optional metadata', async () => {
      const contactInfo = createContactInfo();

      const result = await service.createReferralIncentive(
        '10.0.0.10',
        '10.0.0.20',
        contactInfo,
        'social',
        15.0,
      );

      expect(result).toMatchObject({
        type: 'referral',
        referrerIP: '10.0.0.10',
        referredIP: '10.0.0.20',
        referralType: 'social',
        expectedValue: 15.0,
        status: 'pending',
      });
      expect(result.metadata).toBeUndefined();
    });

    it('should create referral with zero expected value', async () => {
      const result = await service.createReferralIncentive(
        '127.0.0.1',
        '127.0.0.2',
        createContactInfo(),
        'free',
        0,
      );

      expect(result.expectedValue).toBe(0);
    });

    it('should create referral with large expected value', async () => {
      const result = await service.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        createContactInfo(),
        'premium',
        10000.99,
      );

      expect(result.expectedValue).toBe(10000.99);
    });

    it('should handle different referral types', async () => {
      const referralTypes = ['direct', 'social', 'email', 'affiliate', 'partner'];

      for (const referralType of referralTypes) {
        const result = await service.createReferralIncentive(
          '192.168.1.1',
          '192.168.1.2',
          createContactInfo(),
          referralType,
          10,
        );
        expect(result.referralType).toBe(referralType);
      }
    });
  });

  // ============================================================================
  // getIncentives
  // ============================================================================
  describe('getIncentives', () => {
    it('should return empty incentives list for organization', async () => {
      const result = await service.getIncentives('org-123');

      expect(result).toMatchObject({
        incentives: [],
        items: [],
        total: 0,
        totalCount: 0,
        totalRewardAmount: 0,
        organizationId: 'org-123',
      });
    });

    it('should return incentives with options', async () => {
      const options: GetIncentivesOptions = {
        status: 'pending',
        type: 'questionnaire',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 10,
        offset: 0,
      };

      const result = await service.getIncentives('org-456', options);

      expect(result.organizationId).toBe('org-456');
      expect(result.options).toEqual(options);
    });

    it('should return response with all required fields', async () => {
      const result = await service.getIncentives('org-test');

      expect(result).toHaveProperty('incentives');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('totalRewardAmount');
      expect(result).toHaveProperty('organizationId');
    });

    it('should handle empty options', async () => {
      const result = await service.getIncentives('org-empty', undefined);

      expect(result.organizationId).toBe('org-empty');
      expect(result.options).toBeUndefined();
    });

    it('should handle partial options', async () => {
      const options: GetIncentivesOptions = {
        status: 'approved',
      };

      const result = await service.getIncentives('org-partial', options);

      expect(result.options?.status).toBe('approved');
    });
  });

  // ============================================================================
  // getIncentive
  // ============================================================================
  describe('getIncentive', () => {
    it('should return not_found status for non-existent incentive', async () => {
      const result = await service.getIncentive('non-existent-id', 'org-123');

      expect(result).toMatchObject({
        incentiveId: 'non-existent-id',
        organizationId: 'org-123',
        status: 'not_found',
        data: null,
      });
    });

    it('should return response with all required fields', async () => {
      const result = await service.getIncentive('incentive-123', 'org-456');

      expect(result).toHaveProperty('incentiveId');
      expect(result).toHaveProperty('organizationId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('data');
    });

    it('should handle different incentive ID formats', async () => {
      const ids = ['incentive_123', 'referral_456', 'uuid-format-789'];

      for (const id of ids) {
        const result = await service.getIncentive(id, 'org-test');
        expect(result.incentiveId).toBe(id);
      }
    });
  });

  // ============================================================================
  // validateIncentive
  // ============================================================================
  describe('validateIncentive', () => {
    it('should return successful validation result', async () => {
      const result = await service.validateIncentive('incentive-123', 'org-456');

      expect(result).toMatchObject({
        incentiveId: 'incentive-123',
        organizationId: 'org-456',
        isValid: true,
        status: 'validated',
        message: 'Incentive validation successful',
        errors: [],
        canProceedToPayment: true,
      });
      expect(result.validatedAt).toBeInstanceOf(Date);
    });

    it('should return response with all required fields', async () => {
      const result = await service.validateIncentive('incentive-test', 'org-test');

      expect(result).toHaveProperty('incentiveId');
      expect(result).toHaveProperty('organizationId');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('validatedAt');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('canProceedToPayment');
    });

    it('should have empty errors array for valid incentive', async () => {
      const result = await service.validateIncentive('valid-incentive', 'org-123');

      expect(result.errors).toEqual([]);
    });

    it('should indicate can proceed to payment for valid incentive', async () => {
      const result = await service.validateIncentive('payment-ready', 'org-456');

      expect(result.canProceedToPayment).toBe(true);
    });
  });

  // ============================================================================
  // approveIncentive
  // ============================================================================
  describe('approveIncentive', () => {
    it('should approve an incentive with all approval data', async () => {
      const approvalData: ApprovalData = {
        approverId: 'admin-123',
        reason: 'Meets quality standards',
        notes: 'Approved after review',
        organizationId: 'org-456',
      };

      const result = await service.approveIncentive('incentive-789', approvalData);

      expect(result).toMatchObject({
        incentiveId: 'incentive-789',
        status: 'approved',
        approvedBy: 'admin-123',
        reason: 'Meets quality standards',
        notes: 'Approved after review',
        organizationId: 'org-456',
      });
      expect(result.approvedAt).toBeInstanceOf(Date);
    });

    it('should approve an incentive without optional notes', async () => {
      const approvalData: ApprovalData = {
        approverId: 'admin-456',
        reason: 'Auto-approved',
        organizationId: 'org-789',
      };

      const result = await service.approveIncentive('incentive-101', approvalData);

      expect(result).toMatchObject({
        incentiveId: 'incentive-101',
        status: 'approved',
        approvedBy: 'admin-456',
        reason: 'Auto-approved',
        organizationId: 'org-789',
      });
      expect(result.notes).toBeUndefined();
    });

    it('should return response with all required fields', async () => {
      const approvalData: ApprovalData = {
        approverId: 'admin-test',
        reason: 'Test approval',
        organizationId: 'org-test',
      };

      const result = await service.approveIncentive('incentive-test', approvalData);

      expect(result).toHaveProperty('incentiveId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('approvedAt');
      expect(result).toHaveProperty('approvedBy');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('organizationId');
    });
  });

  // ============================================================================
  // rejectIncentive
  // ============================================================================
  describe('rejectIncentive', () => {
    it('should reject an incentive with all parameters', async () => {
      const result = await service.rejectIncentive(
        'incentive-123',
        'Quality score below threshold',
        'admin-456',
        'org-789',
        'Score was only 45, minimum is 60',
      );

      expect(result).toMatchObject({
        incentiveId: 'incentive-123',
        status: 'rejected',
        rejectedBy: 'admin-456',
        reason: 'Quality score below threshold',
        notes: 'Score was only 45, minimum is 60',
        organizationId: 'org-789',
      });
      expect(result.rejectedAt).toBeInstanceOf(Date);
    });

    it('should reject an incentive without optional notes', async () => {
      const result = await service.rejectIncentive(
        'incentive-456',
        'Invalid contact information',
        'admin-789',
        'org-101',
      );

      expect(result).toMatchObject({
        incentiveId: 'incentive-456',
        status: 'rejected',
        rejectedBy: 'admin-789',
        reason: 'Invalid contact information',
        organizationId: 'org-101',
      });
      expect(result.notes).toBeUndefined();
    });

    it('should return response with all required fields', async () => {
      const result = await service.rejectIncentive(
        'incentive-test',
        'Test rejection',
        'admin-test',
        'org-test',
      );

      expect(result).toHaveProperty('incentiveId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('rejectedAt');
      expect(result).toHaveProperty('rejectedBy');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('organizationId');
    });
  });

  // ============================================================================
  // processPayment
  // ============================================================================
  describe('processPayment', () => {
    it('should process payment successfully with all options', async () => {
      const options: PaymentOptions = {
        amount: 50.0,
        currency: 'USD',
        notes: 'Monthly payout',
        referenceId: 'ref-123',
        transactionRef: 'txn-ref-456',
        reason: 'Reward completion',
        paymentMethod: 'paypal',
      };

      const result = await service.processPayment(
        'incentive-123',
        'bank-transfer',
        'finance-456',
        'org-789',
        options,
      );

      expect(result).toMatchObject({
        success: true,
        transactionId: expect.stringMatching(/^txn_\d+$/),
        amount: 50.0,
        currency: 'USD',
        paymentMethod: 'bank-transfer',
        processedBy: 'finance-456',
        organizationId: 'org-789',
      });
      expect(result.processedAt).toBeInstanceOf(Date);
    });

    it('should process payment with default values when options not provided', async () => {
      const result = await service.processPayment(
        'incentive-default',
        'paypal',
        'finance-123',
        'org-456',
      );

      expect(result).toMatchObject({
        success: true,
        amount: 10.0,
        currency: 'USD',
        paymentMethod: 'paypal',
        processedBy: 'finance-123',
        organizationId: 'org-456',
      });
    });

    it('should process payment with partial options', async () => {
      const options: PaymentOptions = {
        amount: 25.0,
        currency: 'EUR',
      };

      const result = await service.processPayment(
        'incentive-partial',
        'stripe',
        'finance-789',
        'org-101',
        options,
      );

      expect(result.amount).toBe(25.0);
      expect(result.currency).toBe('EUR');
    });

    it('should return response with all required fields', async () => {
      const result = await service.processPayment(
        'incentive-test',
        'test-method',
        'test-processor',
        'test-org',
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('transactionId');
      expect(result).toHaveProperty('amount');
      expect(result).toHaveProperty('currency');
      expect(result).toHaveProperty('paymentMethod');
      expect(result).toHaveProperty('processedBy');
      expect(result).toHaveProperty('organizationId');
      expect(result).toHaveProperty('processedAt');
    });

    it('should handle zero amount payment', async () => {
      const options: PaymentOptions = { amount: 0 };

      const result = await service.processPayment(
        'incentive-zero',
        'free',
        'finance-123',
        'org-456',
        options,
      );

      expect(result.amount).toBe(0);
    });

    it('should handle large amount payment', async () => {
      const options: PaymentOptions = { amount: 1000000.0 };

      const result = await service.processPayment(
        'incentive-large',
        'wire',
        'finance-789',
        'org-101',
        options,
      );

      expect(result.amount).toBe(1000000.0);
    });
  });

  // ============================================================================
  // batchProcessIncentives
  // ============================================================================
  describe('batchProcessIncentives', () => {
    it('should process multiple incentives successfully', async () => {
      const incentiveIds = ['inc-1', 'inc-2', 'inc-3'];
      const result = await service.batchProcessIncentives(
        incentiveIds,
        'approve',
        'admin-123',
        'org-456',
      );

      expect(result).toMatchObject({
        totalProcessed: 3,
        successful: 3,
        failed: 0,
        action: 'approve',
        processedBy: 'admin-123',
        organizationId: 'org-456',
      });
      expect(result.results).toHaveLength(3);
    });

    it('should return correct results for each incentive', async () => {
      const incentiveIds = ['inc-a', 'inc-b'];
      const result = await service.batchProcessIncentives(
        incentiveIds,
        'validate',
        'admin-456',
        'org-789',
      );

      result.results.forEach((r, index) => {
        expect(r.incentiveId).toBe(incentiveIds[index]);
        expect(r.success).toBe(true);
        expect(r.action).toBe('validate');
        expect(r.processedAt).toBeInstanceOf(Date);
      });
    });

    it('should handle empty incentive list', async () => {
      const result = await service.batchProcessIncentives(
        [],
        'approve',
        'admin-789',
        'org-101',
      );

      expect(result).toMatchObject({
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        results: [],
      });
    });

    it('should handle large batch sizes', async () => {
      const incentiveIds = Array(100).fill(null).map((_, i) => `inc-${i}`);
      const result = await service.batchProcessIncentives(
        incentiveIds,
        'payment',
        'admin-batch',
        'org-batch',
      );

      expect(result.totalProcessed).toBe(100);
      expect(result.successful).toBe(100);
      expect(result.results).toHaveLength(100);
    });

    it('should handle different action types', async () => {
      const actions = ['approve', 'reject', 'validate', 'payment', 'export'];

      for (const action of actions) {
        const result = await service.batchProcessIncentives(
          ['inc-1'],
          action,
          'admin-test',
          'org-test',
        );
        expect(result.action).toBe(action);
      }
    });

    it('should return response with all required fields', async () => {
      const result = await service.batchProcessIncentives(
        ['inc-test'],
        'test-action',
        'test-user',
        'test-org',
      );

      expect(result).toHaveProperty('totalProcessed');
      expect(result).toHaveProperty('successful');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('processedBy');
      expect(result).toHaveProperty('organizationId');
    });
  });

  // ============================================================================
  // getIncentiveStatistics
  // ============================================================================
  describe('getIncentiveStatistics', () => {
    it('should return statistics for organization', async () => {
      const result = await service.getIncentiveStatistics(
        'org-123',
        '30d',
        'day',
      );

      expect(result).toMatchObject({
        totalIncentives: 0,
        totalRewardAmount: 0,
        avgRewardAmount: 0,
        conversionRate: 0,
        statusDistribution: {},
        rewardTypeDistribution: {},
        paymentMethodDistribution: {},
        trends: [],
        topPerformers: [],
        organizationId: 'org-123',
        timeRange: '30d',
        groupBy: 'day',
      });
    });

    it('should return response with all required fields', async () => {
      const result = await service.getIncentiveStatistics(
        'org-test',
        '7d',
        'week',
      );

      expect(result).toHaveProperty('totalIncentives');
      expect(result).toHaveProperty('totalRewardAmount');
      expect(result).toHaveProperty('avgRewardAmount');
      expect(result).toHaveProperty('conversionRate');
      expect(result).toHaveProperty('statusDistribution');
      expect(result).toHaveProperty('rewardTypeDistribution');
      expect(result).toHaveProperty('paymentMethodDistribution');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('topPerformers');
      expect(result).toHaveProperty('organizationId');
      expect(result).toHaveProperty('timeRange');
      expect(result).toHaveProperty('groupBy');
    });

    it('should handle different time ranges', async () => {
      const timeRanges = ['24h', '7d', '30d', '90d', '1y'];

      for (const timeRange of timeRanges) {
        const result = await service.getIncentiveStatistics(
          'org-time',
          timeRange,
          'day',
        );
        expect(result.timeRange).toBe(timeRange);
      }
    });

    it('should handle different groupBy values', async () => {
      const groupByValues = ['hour', 'day', 'week', 'month'];

      for (const groupBy of groupByValues) {
        const result = await service.getIncentiveStatistics(
          'org-group',
          '30d',
          groupBy,
        );
        expect(result.groupBy).toBe(groupBy);
      }
    });
  });

  // ============================================================================
  // exportIncentiveData
  // ============================================================================
  describe('exportIncentiveData', () => {
    it('should export data with default CSV format', async () => {
      const exportOptions: ExportOptions = {};

      const result = await service.exportIncentiveData('org-123', exportOptions);

      expect(result).toMatchObject({
        format: 'csv',
        estimatedTime: '5 minutes',
        organizationId: 'org-123',
      });
      expect(result.exportId).toMatch(/^export_\d+$/);
      expect(result.downloadUrl).toMatch(/\/downloads\/export_\d+\.csv$/);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should export data in xlsx format', async () => {
      const exportOptions: ExportOptions = { format: 'xlsx' };

      const result = await service.exportIncentiveData('org-456', exportOptions);

      expect(result.format).toBe('xlsx');
      expect(result.downloadUrl).toMatch(/\.xlsx$/);
    });

    it('should normalize excel format to xlsx', async () => {
      const exportOptions: ExportOptions = { format: 'excel' };

      const result = await service.exportIncentiveData('org-789', exportOptions);

      expect(result.format).toBe('xlsx');
    });

    it('should export data in json format', async () => {
      const exportOptions: ExportOptions = { format: 'json' };

      const result = await service.exportIncentiveData('org-json', exportOptions);

      expect(result.format).toBe('json');
      expect(result.downloadUrl).toMatch(/\.json$/);
    });

    it('should include export options in response', async () => {
      const exportOptions: ExportOptions = {
        format: 'xlsx',
        status: 'approved',
        type: 'questionnaire',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        includeMetadata: true,
        requestedBy: 'admin-123',
      };

      const result = await service.exportIncentiveData('org-options', exportOptions);

      expect(result.exportOptions).toEqual(exportOptions);
    });

    it('should return response with all required fields', async () => {
      const result = await service.exportIncentiveData('org-test', {});

      expect(result).toHaveProperty('exportId');
      expect(result).toHaveProperty('format');
      expect(result).toHaveProperty('estimatedTime');
      expect(result).toHaveProperty('downloadUrl');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('organizationId');
      expect(result).toHaveProperty('exportOptions');
    });

    it('should set expiry date to 24 hours in the future', async () => {
      const beforeExport = Date.now();
      const result = await service.exportIncentiveData('org-expiry', {});
      const expectedExpiry = new Date(beforeExport + 24 * 60 * 60 * 1000);

      // Allow 1 second tolerance for test execution time
      const tolerance = 1000;
      expect(
        Math.abs(result.expiresAt.getTime() - expectedExpiry.getTime())
      ).toBeLessThan(tolerance);
    });

    it('should handle export options with date range object', async () => {
      const exportOptions: ExportOptions = {
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
      };

      const result = await service.exportIncentiveData('org-range', exportOptions);

      expect(result.exportOptions.dateRange).toEqual({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });
    });

    it('should handle export options with array values', async () => {
      const exportOptions: ExportOptions = {
        status: ['approved', 'paid'],
        rewardTypes: ['cash', 'points'],
      };

      const result = await service.exportIncentiveData('org-array', exportOptions);

      expect(result.exportOptions.status).toEqual(['approved', 'paid']);
      expect(result.exportOptions.rewardTypes).toEqual(['cash', 'points']);
    });
  });

  // ============================================================================
  // configureIncentiveRules
  // ============================================================================
  describe('configureIncentiveRules', () => {
    it('should configure rules with full configuration', async () => {
      const rulesConfig: RulesConfig = {
        maxRewardAmount: 1000,
        minRewardAmount: 1,
        approvalRequired: true,
        autoApproveThreshold: 50,
        rewardTiers: [
          { minScore: 0, maxScore: 50, reward: 10 },
          { minScore: 51, maxScore: 80, reward: 25 },
          { minScore: 81, maxScore: 100, reward: 50 },
        ],
        questionnaireRules: {
          minQualityScore: 60,
          rewardTiers: [
            { minScore: 60, maxScore: 80, rewardAmount: 15 },
            { minScore: 81, maxScore: 100, rewardAmount: 30 },
          ],
        },
        referralRules: {
          rewardAmount: 10,
          maxReferralsPerIP: 5,
        },
        paymentRules: {
          minAmount: 10,
          maxAmount: 500,
          requiresApproval: true,
        },
        enabled: true,
      };

      const result = await service.configureIncentiveRules(
        'org-123',
        rulesConfig,
        'admin-456',
      );

      expect(result).toMatchObject({
        rules: rulesConfig,
        organizationId: 'org-123',
        configuredBy: 'admin-456',
      });
      expect(result.configId).toMatch(/^config_\d+$/);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should configure rules with minimal configuration', async () => {
      const rulesConfig: RulesConfig = {
        enabled: true,
      };

      const result = await service.configureIncentiveRules(
        'org-minimal',
        rulesConfig,
        'admin-minimal',
      );

      expect(result.rules.enabled).toBe(true);
      expect(result.organizationId).toBe('org-minimal');
    });

    it('should return response with all required fields', async () => {
      const result = await service.configureIncentiveRules(
        'org-test',
        {},
        'admin-test',
      );

      expect(result).toHaveProperty('configId');
      expect(result).toHaveProperty('rules');
      expect(result).toHaveProperty('organizationId');
      expect(result).toHaveProperty('configuredBy');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should preserve all rules configuration fields', async () => {
      const rulesConfig: RulesConfig = {
        maxRewardAmount: 500,
        minRewardAmount: 5,
        approvalRequired: false,
        autoApproveThreshold: 100,
      };

      const result = await service.configureIncentiveRules(
        'org-preserve',
        rulesConfig,
        'admin-preserve',
      );

      expect(result.rules.maxRewardAmount).toBe(500);
      expect(result.rules.minRewardAmount).toBe(5);
      expect(result.rules.approvalRequired).toBe(false);
      expect(result.rules.autoApproveThreshold).toBe(100);
    });
  });

  // ============================================================================
  // getHealthStatus
  // ============================================================================
  describe('getHealthStatus', () => {
    it('should return healthy status for all components', async () => {
      const result = await service.getHealthStatus();

      expect(result).toMatchObject({
        overall: 'healthy',
        database: 'healthy',
        paymentProcessor: 'healthy',
        ruleEngine: 'healthy',
        eventProcessing: 'healthy',
      });
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it('should return response with all required fields', async () => {
      const result = await service.getHealthStatus();

      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('paymentProcessor');
      expect(result).toHaveProperty('ruleEngine');
      expect(result).toHaveProperty('eventProcessing');
      expect(result).toHaveProperty('checkedAt');
    });

    it('should not have error field when healthy', async () => {
      const result = await service.getHealthStatus();

      expect(result.error).toBeUndefined();
    });

    it('should return checkedAt as a valid date', async () => {
      const beforeCheck = Date.now();
      const result = await service.getHealthStatus();
      const afterCheck = Date.now();

      expect(result.checkedAt!.getTime()).toBeGreaterThanOrEqual(beforeCheck);
      expect(result.checkedAt!.getTime()).toBeLessThanOrEqual(afterCheck);
    });
  });

  // ============================================================================
  // Edge Cases and Boundary Tests
  // ============================================================================
  describe('Edge Cases and Boundary Tests', () => {
    describe('Concurrent Operations', () => {
      it('should handle concurrent incentive creation', async () => {
        const promises = Array(10)
          .fill(null)
          .map((_, i) =>
            service.createQuestionnaireIncentive(
              `192.168.1.${i}`,
              `questionnaire-${i}`,
              50 + i,
              createContactInfo(),
              createBusinessValue(),
              'cash',
            ),
          );

        const results = await Promise.all(promises);

        results.forEach((result, index) => {
          expect(result.userIP).toBe(`192.168.1.${index}`);
          expect(result.qualityScore).toBe(50 + index);
          expect(result.status).toBe('pending');
        });
      });

      it('should handle concurrent validation operations', async () => {
        const promises = Array(5)
          .fill(null)
          .map((_, i) =>
            service.validateIncentive(`incentive-${i}`, 'org-concurrent'),
          );

        const results = await Promise.all(promises);

        results.forEach((result, index) => {
          expect(result.incentiveId).toBe(`incentive-${index}`);
          expect(result.isValid).toBe(true);
        });
      });

      it('should handle concurrent payment processing', async () => {
        const promises = Array(5)
          .fill(null)
          .map((_, i) =>
            service.processPayment(
              `incentive-payment-${i}`,
              'paypal',
              'finance-concurrent',
              'org-concurrent',
              { amount: 10 + i },
            ),
          );

        const results = await Promise.all(promises);

        results.forEach((result, index) => {
          expect(result.success).toBe(true);
          expect(result.amount).toBe(10 + index);
        });
      });
    });

    describe('Special Character Handling', () => {
      it('should handle special characters in reason text', async () => {
        const result = await service.rejectIncentive(
          'incentive-special',
          'Reason with special chars: <>&"\'',
          'admin-special',
          'org-special',
        );

        expect(result.reason).toBe('Reason with special chars: <>&"\'');
      });

      it('should handle unicode characters in notes', async () => {
        const result = await service.approveIncentive('incentive-unicode', {
          approverId: 'admin-unicode',
          reason: 'Test approval',
          notes: 'Unicode: 你好世界 🎉',
          organizationId: 'org-unicode',
        });

        expect(result.notes).toBe('Unicode: 你好世界 🎉');
      });
    });

    describe('Long String Handling', () => {
      it('should handle very long incentive IDs', async () => {
        const longId = 'a'.repeat(1000);
        const result = await service.getIncentive(longId, 'org-long');

        expect(result.incentiveId).toBe(longId);
      });

      it('should handle very long notes', async () => {
        const longNotes = 'This is a very long note. '.repeat(100);
        const result = await service.approveIncentive('incentive-long', {
          approverId: 'admin-long',
          reason: 'Test',
          notes: longNotes,
          organizationId: 'org-long',
        });

        expect(result.notes).toBe(longNotes);
      });
    });

    describe('Empty and Null Handling', () => {
      it('should handle empty business value', async () => {
        const result = await service.createQuestionnaireIncentive(
          '127.0.0.1',
          'q-empty',
          50,
          createContactInfo(),
          {},
          'cash',
        );

        expect(result.businessValue).toEqual({});
      });

      it('should handle empty metadata', async () => {
        const result = await service.createReferralIncentive(
          '192.168.1.1',
          '192.168.1.2',
          createContactInfo(),
          'direct',
          10,
          {},
        );

        expect(result.metadata).toEqual({});
      });
    });
  });

  // ============================================================================
  // Error Handling Tests (Catch Block Coverage)
  // ============================================================================
  describe('Error Handling', () => {
    describe('createQuestionnaireIncentive error handling', () => {
      it('should throw error when an exception occurs during creation', async () => {
        // Force an error by mocking logger.log to throw
        const loggerSpy = jest
          .spyOn(service['logger'], 'log')
          .mockImplementation(() => {
            throw new Error('Logger error');
          });

        await expect(
          service.createQuestionnaireIncentive(
            '192.168.1.1',
            'q-error',
            50,
            createContactInfo(),
            {},
            'cash',
          ),
        ).rejects.toThrow('Error creating questionnaire incentive');

        loggerSpy.mockRestore();
      });
    });

    describe('createReferralIncentive error handling', () => {
      it('should throw error when an exception occurs during creation', async () => {
        const loggerSpy = jest
          .spyOn(service['logger'], 'log')
          .mockImplementation(() => {
            throw new Error('Logger error');
          });

        await expect(
          service.createReferralIncentive(
            '192.168.1.1',
            '192.168.1.2',
            createContactInfo(),
            'direct',
            10,
          ),
        ).rejects.toThrow('Error creating referral incentive');

        loggerSpy.mockRestore();
      });
    });

    describe('validateIncentive error handling', () => {
      it('should throw error when an exception occurs', async () => {
        const originalDate = global.Date;
         
        const mockDateConstructor: any = jest.fn().mockImplementation(() => {
          throw new Error('Date constructor error');
        });
        mockDateConstructor.now = originalDate.now;
        (global as Record<string, unknown>).Date = mockDateConstructor;

        await expect(
          service.validateIncentive('incentive-123', 'org-123'),
        ).rejects.toThrow('Error validating incentive');

        (global as Record<string, unknown>).Date = originalDate;
      });
    });

    describe('approveIncentive error handling', () => {
      it('should throw error when an exception occurs', async () => {
        const originalDate = global.Date;
         
        const mockDateConstructor: any = jest.fn().mockImplementation(() => {
          throw new Error('Date constructor error');
        });
        mockDateConstructor.now = originalDate.now;
        (global as Record<string, unknown>).Date = mockDateConstructor;

        await expect(
          service.approveIncentive('incentive-123', {
            approverId: 'admin',
            reason: 'test',
            organizationId: 'org-123',
          }),
        ).rejects.toThrow('Error approving incentive');

        (global as Record<string, unknown>).Date = originalDate;
      });
    });

    describe('rejectIncentive error handling', () => {
      it('should throw error when an exception occurs', async () => {
        const loggerSpy = jest
          .spyOn(service['logger'], 'log')
          .mockImplementation(() => {
            throw new Error('Logger error');
          });

        await expect(
          service.rejectIncentive('inc-1', 'reason', 'admin', 'org-1'),
        ).rejects.toThrow('Error rejecting incentive');

        loggerSpy.mockRestore();
      });
    });

    describe('processPayment error handling', () => {
      it('should return failure result when an exception occurs', async () => {
        const loggerSpy = jest
          .spyOn(service['logger'], 'log')
          .mockImplementation(() => {
            throw new Error('Payment error');
          });

        const result = await service.processPayment(
          'inc-1',
          'paypal',
          'finance',
          'org-1',
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Payment error');

        loggerSpy.mockRestore();
      });

      it('should return failure result with string error when non-Error thrown', async () => {
        const loggerSpy = jest
          .spyOn(service['logger'], 'log')
          .mockImplementation(() => {
            throw 'String error';  
          });

        const result = await service.processPayment(
          'inc-1',
          'paypal',
          'finance',
          'org-1',
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('String error');

        loggerSpy.mockRestore();
      });
    });

    describe('batchProcessIncentives error handling', () => {
      it('should throw error when an exception occurs', async () => {
        const loggerSpy = jest
          .spyOn(service['logger'], 'log')
          .mockImplementation(() => {
            throw new Error('Batch error');
          });

        await expect(
          service.batchProcessIncentives(['inc-1'], 'approve', 'admin', 'org-1'),
        ).rejects.toThrow('Batch error');

        loggerSpy.mockRestore();
      });
    });

    describe('exportIncentiveData error handling', () => {
      it('should throw error when an exception occurs', async () => {
        const originalDateNow = Date.now;
        let callCount = 0;
        const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            throw new Error('Date error');
          }
          return originalDateNow();
        });

        await expect(
          service.exportIncentiveData('org-1', {}),
        ).rejects.toThrow('Date error'); // Re-throws original error

        dateSpy.mockRestore();
      });
    });

    describe('configureIncentiveRules error handling', () => {
      it('should throw error when an exception occurs', async () => {
        const originalDateNow = Date.now;
        let callCount = 0;
        const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            throw new Error('Date error');
          }
          return originalDateNow();
        });

        await expect(
          service.configureIncentiveRules('org-1', {}, 'admin'),
        ).rejects.toThrow('Date error'); // Re-throws original error

        dateSpy.mockRestore();
      });
    });

    describe('getHealthStatus error handling', () => {
      it('should return unhealthy status when an exception occurs', async () => {
        const originalDate = global.Date;
         
        const mockDateConstructor: any = jest.fn().mockImplementation(() => {
          throw new Error('Health check error');
        });
        mockDateConstructor.now = originalDate.now;
        (global as Record<string, unknown>).Date = mockDateConstructor;

        const result = await service.getHealthStatus();

        expect(result.overall).toBe('unhealthy');
        expect(result.database).toBe('unknown');
        expect(result.paymentProcessor).toBe('unknown');
        expect(result.ruleEngine).toBe('unknown');
        expect(result.eventProcessing).toBe('unknown');
        expect(result.error).toBe('Health check error');

        (global as Record<string, unknown>).Date = originalDate;
      });

      it('should return unhealthy status with string error when non-Error thrown', async () => {
        const originalDate = global.Date;
         
        const mockDateConstructor: any = jest.fn().mockImplementation(() => {
          throw 'Health check failed';  
        });
        mockDateConstructor.now = originalDate.now;
        (global as Record<string, unknown>).Date = mockDateConstructor;

        const result = await service.getHealthStatus();

        expect(result.overall).toBe('unhealthy');
        expect(result.error).toBe('Health check failed');

        (global as Record<string, unknown>).Date = originalDate;
      });
    });
  });

  // ============================================================================
  // Response Type Validation
  // ============================================================================
  describe('Response Type Validation', () => {
    it('should return correct type for QuestionnaireIncentive', async () => {
      const result = await service.createQuestionnaireIncentive(
        '127.0.0.1',
        'q-type',
        75,
        createContactInfo(),
        createBusinessValue(),
        'cash',
      );

      expect(result.type).toBe('questionnaire');
      expect(result).toHaveProperty('userIP');
      expect(result).toHaveProperty('questionnaireId');
      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('businessValue');
      expect(result).toHaveProperty('incentiveType');
    });

    it('should return correct type for ReferralIncentive', async () => {
      const result = await service.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        createContactInfo(),
        'direct',
        25,
      );

      expect(result.type).toBe('referral');
      expect(result).toHaveProperty('referrerIP');
      expect(result).toHaveProperty('referredIP');
      expect(result).toHaveProperty('referralType');
      expect(result).toHaveProperty('expectedValue');
    });

    it('should return valid status values', async () => {
      const validStatuses = [
        'pending',
        'validated',
        'approved',
        'rejected',
        'paid',
        'cancelled',
        'not_found',
      ];

      // Test each status through different methods
      const created = await service.createQuestionnaireIncentive(
        '127.0.0.1',
        'q-status',
        75,
        createContactInfo(),
        {},
        'cash',
      );
      expect(validStatuses).toContain(created.status);

      const validated = await service.validateIncentive('inc-status', 'org-status');
      expect(validated.status).toBe('validated');

      const approved = await service.approveIncentive('inc-status', {
        approverId: 'admin',
        reason: 'test',
        organizationId: 'org',
      });
      expect(approved.status).toBe('approved');

      const rejected = await service.rejectIncentive(
        'inc-status',
        'test',
        'admin',
        'org',
      );
      expect(rejected.status).toBe('rejected');

      const notFound = await service.getIncentive('nonexistent', 'org');
      expect(notFound.status).toBe('not_found');
    });
  });
});
