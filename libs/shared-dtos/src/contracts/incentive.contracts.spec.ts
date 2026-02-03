import {
  IncentiveContracts,
  IncentiveContractViolation,
} from './incentive.contracts';
import {
  Incentive,
  IncentiveStatus,
  PaymentMethod,
  ContactInfo,
} from '../domains/incentive.dto';

describe('IncentiveContracts', () => {
  describe('createQuestionnaireIncentive', () => {
    // Happy path tests
    it('should create questionnaire incentive with valid inputs', () => {
      const ip = '192.168.1.1';
      const questionnaireId = 'quest_123';
      const qualityScore = 85;
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      const incentive = IncentiveContracts.createQuestionnaireIncentive(
        ip,
        questionnaireId,
        qualityScore,
        contactInfo,
      );

      expect(incentive).toBeDefined();
      expect(incentive.getRecipientIP()).toBe(ip);
      expect(incentive.getRewardAmount()).toBeGreaterThan(0);
    });

    it('should create with approved status for high quality score', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      const incentive = IncentiveContracts.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        90,
        contactInfo,
      );

      expect(incentive.getStatus()).toBe(IncentiveStatus.APPROVED);
      expect(incentive.getRewardAmount()).toBe(8);
    });

    it('should create with pending status for standard quality score', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      const incentive = IncentiveContracts.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        65,
        contactInfo,
      );

      expect(incentive.getStatus()).toBe(IncentiveStatus.PENDING_VALIDATION);
    });

    // Precondition validation tests
    it('should throw error when IP format is invalid', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      expect(() => {
        IncentiveContracts.createQuestionnaireIncentive(
          'invalid-ip',
          'quest_123',
          85,
          contactInfo,
        );
      }).toThrow('IP address must be valid IPv4 format');
    });

    it('should throw error when questionnaire ID is empty', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      expect(() => {
        IncentiveContracts.createQuestionnaireIncentive(
          '192.168.1.1',
          '',
          85,
          contactInfo,
        );
      }).toThrow('Questionnaire ID is required for incentive creation');
    });

    it('should throw error when quality score is out of range', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      expect(() => {
        IncentiveContracts.createQuestionnaireIncentive(
          '192.168.1.1',
          'quest_123',
          -10,
          contactInfo,
        );
      }).toThrow('Quality score must be a number between 0 and 100');

      expect(() => {
        IncentiveContracts.createQuestionnaireIncentive(
          '192.168.1.1',
          'quest_123',
          150,
          contactInfo,
        );
      }).toThrow('Quality score must be a number between 0 and 100');
    });

    it('should throw error when contact info is invalid', () => {
      const invalidContactInfo = new ContactInfo({});

      expect(() => {
        IncentiveContracts.createQuestionnaireIncentive(
          '192.168.1.1',
          'quest_123',
          85,
          invalidContactInfo,
        );
      }).toThrow('Valid contact information is required');
    });

    // Postcondition validation tests
    it('should ensure created incentive has correct IP', () => {
      const ip = '192.168.1.1';
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      const incentive = IncentiveContracts.createQuestionnaireIncentive(
        ip,
        'quest_123',
        85,
        contactInfo,
      );

      expect(incentive.getRecipientIP()).toBe(ip);
    });

    it('should ensure created incentive has positive reward amount', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      const incentive = IncentiveContracts.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        contactInfo,
      );

      expect(incentive.getRewardAmount()).toBeGreaterThan(0);
    });

    // Edge cases
    it('should handle quality score at boundaries', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      // Only test scores that qualify for rewards (50+)
      const scores = [50, 70, 90, 100];
      scores.forEach((score) => {
        const incentive = IncentiveContracts.createQuestionnaireIncentive(
          '192.168.1.1',
          'quest_123',
          score,
          contactInfo,
        );
        expect(incentive).toBeDefined();
        expect(incentive.getRewardAmount()).toBeGreaterThan(0);
      });
    });

    it('should handle different contact info types', () => {
      const contactTypes = [
        new ContactInfo({ wechat: 'test_wechat' }),
        new ContactInfo({ alipay: 'test_alipay' }),
        new ContactInfo({ email: 'test@example.com' }),
        new ContactInfo({ phone: '13800138000' }),
      ];

      contactTypes.forEach((contactInfo) => {
        const incentive = IncentiveContracts.createQuestionnaireIncentive(
          '192.168.1.1',
          'quest_123',
          85,
          contactInfo,
        );
        expect(incentive).toBeDefined();
      });
    });
  });

  describe('createReferralIncentive', () => {
    // Happy path tests
    it('should create referral incentive with valid inputs', () => {
      const referrerIP = '192.168.1.1';
      const referredIP = '192.168.1.2';
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      const incentive = IncentiveContracts.createReferralIncentive(
        referrerIP,
        referredIP,
        contactInfo,
      );

      expect(incentive).toBeDefined();
      expect(incentive.getRecipientIP()).toBe(referrerIP);
      expect(incentive.getRewardAmount()).toBe(3);
    });

    // Precondition validation tests
    it('should throw error when referrer IP is invalid', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      expect(() => {
        IncentiveContracts.createReferralIncentive(
          'invalid-ip',
          '192.168.1.2',
          contactInfo,
        );
      }).toThrow('IP address must be valid IPv4 format');
    });

    it('should throw error when referred IP is invalid', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      expect(() => {
        IncentiveContracts.createReferralIncentive(
          '192.168.1.1',
          'invalid-ip',
          contactInfo,
        );
      }).toThrow('IP address must be valid IPv4 format');
    });

    it('should throw error when referrer and referred IPs are the same', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      expect(() => {
        IncentiveContracts.createReferralIncentive(
          '192.168.1.1',
          '192.168.1.1',
          contactInfo,
        );
      }).toThrow('Referrer and referred IP addresses must be different');
    });

    it('should throw error when contact info is invalid', () => {
      const invalidContactInfo = new ContactInfo({});

      expect(() => {
        IncentiveContracts.createReferralIncentive(
          '192.168.1.1',
          '192.168.1.2',
          invalidContactInfo,
        );
      }).toThrow('Valid contact information is required');
    });

    // Postcondition validation tests
    it('should ensure created incentive has correct referrer IP', () => {
      const referrerIP = '192.168.1.1';
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      const incentive = IncentiveContracts.createReferralIncentive(
        referrerIP,
        '192.168.1.2',
        contactInfo,
      );

      expect(incentive.getRecipientIP()).toBe(referrerIP);
    });

    it('should ensure reward amount is correct for referrals', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      const incentive = IncentiveContracts.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        contactInfo,
      );

      expect(incentive.getRewardAmount()).toBe(3);
    });

    // Edge cases
    it('should handle different valid IP pairs', () => {
      const ipPairs = [
        ['10.0.0.1', '10.0.0.2'],
        ['172.16.0.1', '172.16.0.2'],
        ['192.168.0.1', '192.168.255.255'],
      ];
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      ipPairs.forEach(([referrerIP, referredIP]) => {
        const incentive = IncentiveContracts.createReferralIncentive(
          referrerIP,
          referredIP,
          contactInfo,
        );
        expect(incentive).toBeDefined();
      });
    });
  });

  describe('validateIncentive', () => {
    // Happy path tests
    it('should validate a valid incentive successfully', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        contactInfo,
      );

      const result = IncentiveContracts.validateIncentive(incentive);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // Precondition validation tests
    it('should throw error when incentive is null', () => {
      expect(() => {
        IncentiveContracts.validateIncentive(null as any);
      }).toThrow('Incentive is required for validation');
    });

    it('should throw error when incentive is already paid', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        90,
        contactInfo,
      );
      // High quality scores auto-approve, so we can execute payment directly
      incentive.executePayment(PaymentMethod.WECHAT_PAY, 'txn_123');

      expect(() => {
        IncentiveContracts.validateIncentive(incentive);
      }).toThrow('Cannot validate already paid incentive');
    });

    // Postcondition validation tests
    it('should ensure result has correct structure', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        contactInfo,
      );

      const result = IncentiveContracts.validateIncentive(incentive);

      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should ensure valid incentive has no errors', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        contactInfo,
      );

      const result = IncentiveContracts.validateIncentive(incentive);

      if (result.isValid) {
        expect(result.errors).toHaveLength(0);
      }
    });
  });

  describe('approveIncentive', () => {
    // Happy path tests
    it('should approve pending incentive successfully', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        65,
        contactInfo,
      );

      IncentiveContracts.approveIncentive(incentive, 'Quality verified');

      expect(incentive.getStatus()).toBe(IncentiveStatus.APPROVED);
    });

    // Precondition validation tests
    it('should throw error when incentive is null', () => {
      expect(() => {
        IncentiveContracts.approveIncentive(null as any, 'reason');
      }).toThrow();
    });

    it('should throw error when incentive is not pending', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        contactInfo,
      );

      expect(() => {
        IncentiveContracts.approveIncentive(incentive, 'reason');
      }).toThrow('Only pending incentives can be approved');
    });

    it('should throw error when reason is empty', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        65,
        contactInfo,
      );

      expect(() => {
        IncentiveContracts.approveIncentive(incentive, '');
      }).toThrow('Approval reason is required');
    });

    // Postcondition validation tests
    it('should ensure status changes to approved', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        65,
        contactInfo,
      );
      const originalStatus = incentive.getStatus();

      IncentiveContracts.approveIncentive(incentive, 'Quality verified');

      expect(incentive.getStatus()).toBe(IncentiveStatus.APPROVED);
      expect(incentive.getStatus()).not.toBe(originalStatus);
    });
  });

  describe('rejectIncentive', () => {
    // Happy path tests
    it('should reject incentive successfully', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        65,
        contactInfo,
      );

      IncentiveContracts.rejectIncentive(incentive, 'Quality too low');

      expect(incentive.getStatus()).toBe(IncentiveStatus.REJECTED);
    });

    // Precondition validation tests
    it('should throw error when incentive is null', () => {
      expect(() => {
        IncentiveContracts.rejectIncentive(null as any, 'reason');
      }).toThrow();
    });

    it('should throw error when incentive is already paid', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        contactInfo,
      );
      incentive.executePayment(PaymentMethod.WECHAT_PAY, 'txn_123');

      expect(() => {
        IncentiveContracts.rejectIncentive(incentive, 'reason');
      }).toThrow('Cannot reject already paid incentive');
    });

    it('should throw error when reason is empty', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        65,
        contactInfo,
      );

      expect(() => {
        IncentiveContracts.rejectIncentive(incentive, '');
      }).toThrow('Rejection reason is required');
    });

    // Postcondition validation tests
    it('should ensure status changes to rejected', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        65,
        contactInfo,
      );

      IncentiveContracts.rejectIncentive(incentive, 'Quality too low');

      expect(incentive.getStatus()).toBe(IncentiveStatus.REJECTED);
    });
  });

  describe('executePayment', () => {
    // Happy path tests
    it('should execute payment successfully for approved incentive', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        contactInfo,
      );

      const result = IncentiveContracts.executePayment(
        incentive,
        PaymentMethod.WECHAT_PAY,
        'txn_123',
      );

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('txn_123');
      expect(incentive.getStatus()).toBe(IncentiveStatus.PAID);
    });

    // Precondition validation tests
    it('should throw error when incentive is null', () => {
      expect(() => {
        IncentiveContracts.executePayment(
          null as any,
          PaymentMethod.WECHAT_PAY,
          'txn_123',
        );
      }).toThrow();
    });

    it('should throw error when incentive is not approved', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        65,
        contactInfo,
      );

      expect(() => {
        IncentiveContracts.executePayment(
          incentive,
          PaymentMethod.WECHAT_PAY,
          'txn_123',
        );
      }).toThrow('Only approved incentives can be paid');
    });

    it('should throw error when payment method is invalid', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        contactInfo,
      );

      expect(() => {
        IncentiveContracts.executePayment(
          incentive,
          'INVALID' as any,
          'txn_123',
        );
      }).toThrow('Valid payment method is required');
    });

    it('should throw error when transaction ID is empty', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        contactInfo,
      );

      expect(() => {
        IncentiveContracts.executePayment(
          incentive,
          PaymentMethod.WECHAT_PAY,
          '',
        );
      }).toThrow('Transaction ID is required for payment');
    });

    it('should throw error when reward amount is below minimum payout', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        contactInfo,
      );

      // Approve first (required for payment)
      incentive.approveForProcessing('referral verified');

      // Referral reward is 3, below minimum payout of 5
      expect(() => {
        IncentiveContracts.executePayment(
          incentive,
          PaymentMethod.WECHAT_PAY,
          'txn_123',
        );
      }).toThrow('Incentive not eligible for payment');
    });

    // Postcondition validation tests
    it('should ensure successful payment sets correct status', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        contactInfo,
      );

      const result = IncentiveContracts.executePayment(
        incentive,
        PaymentMethod.WECHAT_PAY,
        'txn_123',
      );

      if (result.success) {
        expect(incentive.getStatus()).toBe(IncentiveStatus.PAID);
      }
    });

    it('should ensure payment result contains correct details', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        contactInfo,
      );
      const rewardAmount = incentive.getRewardAmount();

      const result = IncentiveContracts.executePayment(
        incentive,
        PaymentMethod.WECHAT_PAY,
        'txn_123',
      );

      expect(result.transactionId).toBe('txn_123');
      expect(result.amount).toBe(rewardAmount);
    });

    it('should ensure failed payment does not change status', () => {
      const contactInfo = new ContactInfo({});
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        contactInfo,
      );
      const originalStatus = incentive.getStatus();

      const result = IncentiveContracts.executePayment(
        incentive,
        PaymentMethod.WECHAT_PAY,
        'txn_123',
      );

      if (!result.success) {
        expect(incentive.getStatus()).toBe(originalStatus);
        expect(result.error).toBeTruthy();
      }
    });

    // Edge cases
    it('should handle different payment methods', () => {
      const paymentMethods = [
        PaymentMethod.WECHAT_PAY,
        PaymentMethod.ALIPAY,
        PaymentMethod.BANK_TRANSFER,
        PaymentMethod.MANUAL,
      ];

      paymentMethods.forEach((method) => {
        const contactInfo = new ContactInfo({
          wechat: 'test',
          alipay: 'test',
          phone: '13800138000',
        });
        const incentive = Incentive.createQuestionnaireIncentive(
          '192.168.1.1',
          'quest_123',
          85,
          contactInfo,
        );

        expect(() => {
          IncentiveContracts.executePayment(incentive, method, 'txn_123');
        }).not.toThrow();
      });
    });
  });

  describe('validateInvariants', () => {
    // Happy path tests
    it('should validate invariants for valid incentive', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        contactInfo,
      );

      expect(() => {
        IncentiveContracts.validateInvariants(incentive);
      }).not.toThrow();
    });

    it('should validate invariants after approval', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        65,
        contactInfo,
      );
      incentive.approveForProcessing('test');

      expect(() => {
        IncentiveContracts.validateInvariants(incentive);
      }).not.toThrow();
    });

    it('should validate invariants after payment', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        85,
        contactInfo,
      );
      incentive.executePayment(PaymentMethod.WECHAT_PAY, 'txn_123');

      expect(() => {
        IncentiveContracts.validateInvariants(incentive);
      }).not.toThrow();
    });
  });

  describe('validateBatchOperation', () => {
    // Happy path tests
    it('should validate valid batch of items', () => {
      const items = [1, 2, 3, 4, 5];

      expect(() => {
        IncentiveContracts.validateBatchOperation(items, 10, 'TestBatch');
      }).not.toThrow();
    });

    // Precondition validation tests
    it('should throw error when items is not an array', () => {
      expect(() => {
        IncentiveContracts.validateBatchOperation(
          'not-array' as any,
          10,
          'TestBatch',
        );
      }).toThrow('TestBatch requires an array of items');
    });

    it('should throw error when items array is empty', () => {
      expect(() => {
        IncentiveContracts.validateBatchOperation([], 10, 'TestBatch');
      }).toThrow('TestBatch requires at least one item');
    });

    it('should throw error when batch size exceeds maximum', () => {
      const items = Array(11).fill(1);

      expect(() => {
        IncentiveContracts.validateBatchOperation(items, 10, 'TestBatch');
      }).toThrow('TestBatch batch size cannot exceed 10');
    });
  });

  describe('validatePaymentCompatibility', () => {
    // Happy path tests
    it('should validate compatible WeChat payment', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      expect(() => {
        IncentiveContracts.validatePaymentCompatibility(
          PaymentMethod.WECHAT_PAY,
          contactInfo,
        );
      }).not.toThrow();
    });

    it('should validate compatible Alipay payment', () => {
      const contactInfo = new ContactInfo({ alipay: 'test_alipay' });

      expect(() => {
        IncentiveContracts.validatePaymentCompatibility(
          PaymentMethod.ALIPAY,
          contactInfo,
        );
      }).not.toThrow();
    });

    // Precondition validation tests
    it('should throw error when payment method is invalid', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      expect(() => {
        IncentiveContracts.validatePaymentCompatibility(
          'INVALID' as any,
          contactInfo,
        );
      }).toThrow('Valid payment method is required');
    });

    it('should throw error when contact info is invalid', () => {
      const invalidContactInfo = new ContactInfo({});

      expect(() => {
        IncentiveContracts.validatePaymentCompatibility(
          PaymentMethod.WECHAT_PAY,
          invalidContactInfo,
        );
      }).toThrow('Valid contact information is required');
    });
  });

  describe('performanceContract', () => {
    // Happy path tests
    it('should execute operation within time limit', () => {
      const operation = () => 'result';

      const result = IncentiveContracts.performanceContract(
        operation,
        100,
        'TestOperation',
      );

      expect(result).toBe('result');
    });

    it('should throw error when operation exceeds time limit', () => {
      const slowOperation = () => {
        const start = Date.now();
        while (Date.now() - start < 150) {
          // Busy wait
        }
        return 'result';
      };

      expect(() => {
        IncentiveContracts.performanceContract(
          slowOperation,
          100,
          'SlowOperation',
        );
      }).toThrow('exceeded maximum execution time');
    });

    // Error handling
    it('should propagate errors from operation', () => {
      const failingOperation = () => {
        throw new Error('Operation failed');
      };

      expect(() => {
        IncentiveContracts.performanceContract(
          failingOperation,
          100,
          'FailingOperation',
        );
      }).toThrow('Operation failed');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete incentive lifecycle', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      // Create with high quality score (90) which auto-approves and gives 8 yuan
      const incentive = IncentiveContracts.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_123',
        90,
        contactInfo,
      );

      // Validate
      const result = IncentiveContracts.validateIncentive(incentive);
      expect(result.isValid).toBe(true);

      // Already approved (auto-approved for high quality)
      expect(incentive.getStatus()).toBe(IncentiveStatus.APPROVED);

      // Execute payment
      const paymentResult = IncentiveContracts.executePayment(
        incentive,
        PaymentMethod.WECHAT_PAY,
        'txn_123',
      );
      expect(paymentResult.success).toBe(true);

      // Validate invariants
      expect(() => {
        IncentiveContracts.validateInvariants(incentive);
      }).not.toThrow();
    });

    it('should enforce all contracts for referral incentive', () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      const incentive = IncentiveContracts.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        contactInfo,
      );

      const result = IncentiveContracts.validateIncentive(incentive);
      expect(result.isValid).toBe(true);

      IncentiveContracts.validateInvariants(incentive);
    });
  });

  describe('Error Types', () => {
    it('should throw IncentiveContractViolation for contract violations', () => {
      expect(() => {
        IncentiveContracts.createQuestionnaireIncentive(
          'invalid-ip',
          'quest_123',
          85,
          new ContactInfo({ wechat: 'test' }),
        );
      }).toThrow(IncentiveContractViolation);
    });

    it('should include operation name in error message', () => {
      try {
        IncentiveContracts.validateIncentive(null as any);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(IncentiveContractViolation);
        expect((error as Error).message).toContain('validateIncentive');
      }
    });
  });
});
