import { UsageLimitContracts } from './usage-limit.contracts';
import {
  UsageLimit,
  UsageLimitPolicy,
  BonusType,
} from '../domains/usage-limit.dto';

describe('UsageLimitContracts', () => {
  describe('checkUsageLimit', () => {
    // Happy path tests
    it('should allow usage when quota is available', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      const result = UsageLimitContracts.checkUsageLimit(ip, usageLimit);

      expect(result.isAllowed()).toBe(true);
      expect(result.getRemainingQuota()).toBe(5);
    });

    it('should block usage when quota is exceeded', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      // Exhaust quota
      for (let i = 0; i < 5; i++) {
        usageLimit.recordUsage();
      }

      const result = UsageLimitContracts.checkUsageLimit(ip, usageLimit);

      expect(result.isAllowed()).toBe(false);
      expect(result.getBlockReason()).toBeTruthy();
      expect(result.getBlockReason()).toContain('Daily usage limit reached');
    });

    // Precondition validation tests
    it('should throw error when IP is null', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      expect(() => {
        UsageLimitContracts.checkUsageLimit(null as any, usageLimit);
      }).toThrow('IP address is required and must be a string');
    });

    it('should throw error when IP is not a string', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      expect(() => {
        UsageLimitContracts.checkUsageLimit(123 as any, usageLimit);
      }).toThrow('IP address is required and must be a string');
    });

    it('should throw error when IP format is invalid', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      expect(() => {
        UsageLimitContracts.checkUsageLimit('invalid-ip', usageLimit);
      }).toThrow('IP address must be valid IPv4 format');
    });

    it('should throw error when UsageLimit is null', () => {
      const ip = '192.168.1.1';

      expect(() => {
        UsageLimitContracts.checkUsageLimit(ip, null as any);
      }).toThrow('UsageLimit instance is required');
    });

    it('should throw error when IP does not match UsageLimit IP', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      expect(() => {
        UsageLimitContracts.checkUsageLimit('192.168.1.2', usageLimit);
      }).toThrow('IP address must match the UsageLimit instance IP');
    });

    // Edge cases
    it('should handle IPv4 boundary values', () => {
      const edgeIPs = ['0.0.0.0', '255.255.255.255', '127.0.0.1'];

      edgeIPs.forEach((ip) => {
        const policy = UsageLimitPolicy.createDefault();
        const usageLimit = UsageLimit.create(ip, policy);
        const result = UsageLimitContracts.checkUsageLimit(ip, usageLimit);
        expect(result.isAllowed()).toBe(true);
      });
    });

    it('should reject invalid IPv4 formats', () => {
      const invalidIPs = ['256.1.1.1', '1.1.1', '1.1.1.1.1', 'abc.def.ghi.jkl'];
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      invalidIPs.forEach((ip) => {
        expect(() => {
          UsageLimitContracts.checkUsageLimit(ip, usageLimit);
        }).toThrow('IP address must be valid IPv4 format');
      });
    });
  });

  describe('recordUsage', () => {
    // Happy path tests
    it('should successfully record usage and increment counter', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      const result = UsageLimitContracts.recordUsage(ip, usageLimit);

      expect(result.isSuccess()).toBe(true);
      expect(result.getCurrentUsage()).toBe(1);
      expect(result.getRemainingQuota()).toBe(4);
    });

    it('should correctly track multiple usage recordings', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      for (let i = 1; i <= 3; i++) {
        const result = UsageLimitContracts.recordUsage(ip, usageLimit);
        expect(result.getCurrentUsage()).toBe(i);
        expect(result.getRemainingQuota()).toBe(5 - i);
      }
    });

    it('should fail when quota is exhausted', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      // Exhaust quota
      for (let i = 0; i < 5; i++) {
        usageLimit.recordUsage();
      }

      const result = UsageLimitContracts.recordUsage(ip, usageLimit);

      expect(result.isSuccess()).toBe(false);
      expect(result.getError()).toBeTruthy();
      expect(result.getError()).toContain('Daily usage limit reached');
    });

    // Precondition validation tests
    it('should throw error when IP format is invalid', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      expect(() => {
        UsageLimitContracts.recordUsage('invalid-ip', usageLimit);
      }).toThrow('IP address must be valid IPv4 format');
    });

    it('should throw error when UsageLimit is null', () => {
      expect(() => {
        UsageLimitContracts.recordUsage('192.168.1.1', null as any);
      }).toThrow('UsageLimit instance is required');
    });

    it('should throw error when IP does not match', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      expect(() => {
        UsageLimitContracts.recordUsage('192.168.1.2', usageLimit);
      }).toThrow('IP address must match the UsageLimit instance IP');
    });

    // Postcondition validation tests
    it('should verify usage count increments by exactly 1', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      const beforeUsage = usageLimit.getCurrentUsage();
      const result = UsageLimitContracts.recordUsage(ip, usageLimit);

      expect(result.getCurrentUsage()).toBe(beforeUsage + 1);
    });

    it('should verify remaining quota decrements by exactly 1', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      const beforeAvailable = usageLimit.getAvailableQuota();
      const result = UsageLimitContracts.recordUsage(ip, usageLimit);

      expect(result.getRemainingQuota()).toBe(beforeAvailable - 1);
    });

    it('should maintain quota consistency (usage + remaining = total)', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      const result = UsageLimitContracts.recordUsage(ip, usageLimit);
      const stats = usageLimit.getUsageStatistics();

      expect(result.getCurrentUsage()! + result.getRemainingQuota()!).toBe(
        stats.availableQuota,
      );
    });

    // Edge cases
    it('should handle recording at exact quota limit', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      // Record up to limit
      for (let i = 0; i < 4; i++) {
        usageLimit.recordUsage();
      }

      const result = UsageLimitContracts.recordUsage(ip, usageLimit);

      expect(result.isSuccess()).toBe(true);
      expect(result.getRemainingQuota()).toBe(0);
    });
  });

  describe('addBonusQuota', () => {
    // Happy path tests
    it('should successfully add bonus quota', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      const beforeAvailable = usageLimit.getAvailableQuota();

      UsageLimitContracts.addBonusQuota(
        ip,
        usageLimit,
        BonusType.QUESTIONNAIRE,
        5,
      );

      const afterStats = usageLimit.getUsageStatistics();
      expect(afterStats.availableQuota).toBe(beforeAvailable + 5);
      expect(afterStats.bonusQuota).toBe(5);
    });

    it('should generate domain event when adding bonus', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      const beforeEvents = usageLimit.getUncommittedEvents().length;

      UsageLimitContracts.addBonusQuota(
        ip,
        usageLimit,
        BonusType.PAYMENT,
        10,
      );

      const afterEvents = usageLimit.getUncommittedEvents().length;
      expect(afterEvents).toBe(beforeEvents + 1);
    });

    it('should support all bonus types', () => {
      const ip = '192.168.1.1';
      const bonusTypes = [
        BonusType.QUESTIONNAIRE,
        BonusType.PAYMENT,
        BonusType.REFERRAL,
        BonusType.PROMOTION,
      ];

      bonusTypes.forEach((bonusType) => {
        const policy = UsageLimitPolicy.createDefault();
        const usageLimit = UsageLimit.create(ip, policy);

        expect(() => {
          UsageLimitContracts.addBonusQuota(ip, usageLimit, bonusType, 3);
        }).not.toThrow();
      });
    });

    // Precondition validation tests
    it('should throw error when IP format is invalid', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      expect(() => {
        UsageLimitContracts.addBonusQuota(
          'invalid-ip',
          usageLimit,
          BonusType.QUESTIONNAIRE,
          5,
        );
      }).toThrow('IP address must be valid IPv4 format');
    });

    it('should throw error when bonus type is invalid', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      expect(() => {
        UsageLimitContracts.addBonusQuota(
          ip,
          usageLimit,
          'INVALID_TYPE' as any,
          5,
        );
      }).toThrow('Bonus type must be a valid BonusType enum value');
    });

    it('should throw error when amount is not a positive integer', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      expect(() => {
        UsageLimitContracts.addBonusQuota(
          ip,
          usageLimit,
          BonusType.QUESTIONNAIRE,
          0,
        );
      }).toThrow('Bonus amount must be a positive integer');

      expect(() => {
        UsageLimitContracts.addBonusQuota(
          ip,
          usageLimit,
          BonusType.QUESTIONNAIRE,
          -5,
        );
      }).toThrow('Bonus amount must be a positive integer');

      expect(() => {
        UsageLimitContracts.addBonusQuota(
          ip,
          usageLimit,
          BonusType.QUESTIONNAIRE,
          2.5,
        );
      }).toThrow('Bonus amount must be a positive integer');
    });

    it('should throw error when amount exceeds maximum limit', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      expect(() => {
        UsageLimitContracts.addBonusQuota(
          ip,
          usageLimit,
          BonusType.PAYMENT,
          25,
        );
      }).toThrow('Bonus amount cannot exceed maximum limit');
    });

    // Edge cases
    it('should handle adding exactly the maximum bonus quota', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      expect(() => {
        UsageLimitContracts.addBonusQuota(
          ip,
          usageLimit,
          BonusType.PAYMENT,
          20,
        );
      }).not.toThrow();
    });

    it('should accumulate multiple bonus additions', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      UsageLimitContracts.addBonusQuota(
        ip,
        usageLimit,
        BonusType.QUESTIONNAIRE,
        5,
      );
      UsageLimitContracts.addBonusQuota(
        ip,
        usageLimit,
        BonusType.REFERRAL,
        3,
      );

      const stats = usageLimit.getUsageStatistics();
      expect(stats.bonusQuota).toBe(8);
    });
  });

  describe('createUsageLimit', () => {
    // Happy path tests
    it('should successfully create usage limit with valid inputs', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();

      const usageLimit = UsageLimitContracts.createUsageLimit(ip, policy);

      expect(usageLimit).toBeDefined();
      expect(usageLimit.getIP()).toBe(ip);
      expect(usageLimit.getCurrentUsage()).toBe(0);
      expect(usageLimit.getAvailableQuota()).toBe(policy.dailyLimit);
    });

    it('should generate creation event', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();

      const usageLimit = UsageLimitContracts.createUsageLimit(ip, policy);
      const events = usageLimit.getUncommittedEvents();

      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe('UsageLimitCreatedEvent');
    });

    // Precondition validation tests
    it('should throw error when IP format is invalid', () => {
      const policy = UsageLimitPolicy.createDefault();

      expect(() => {
        UsageLimitContracts.createUsageLimit('invalid-ip', policy);
      }).toThrow('IP address must be valid IPv4 format');
    });

    it('should throw error when policy is null', () => {
      const ip = '192.168.1.1';

      expect(() => {
        UsageLimitContracts.createUsageLimit(ip, null as any);
      }).toThrow('Usage limit policy is required');
    });

    // Edge cases
    it('should create with various valid IP addresses', () => {
      const validIPs = [
        '0.0.0.0',
        '127.0.0.1',
        '192.168.1.1',
        '255.255.255.255',
      ];
      const policy = UsageLimitPolicy.createDefault();

      validIPs.forEach((ip) => {
        const usageLimit = UsageLimitContracts.createUsageLimit(ip, policy);
        expect(usageLimit.getIP()).toBe(ip);
      });
    });
  });

  describe('validateDailyReset', () => {
    // Happy path tests
    it('should validate that usage limit instance is required', () => {
      expect(() => {
        UsageLimitContracts.validateDailyReset(null as any);
      }).toThrow('UsageLimit instance is required');
    });

    it('should return reset status for valid usage limit', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      const resetOccurred =
        UsageLimitContracts.validateDailyReset(usageLimit);

      expect(typeof resetOccurred).toBe('boolean');
    });

    // Edge cases - testing reset behavior indirectly
    it('should not throw error with fresh usage limit', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      expect(() => {
        UsageLimitContracts.validateDailyReset(usageLimit);
      }).not.toThrow();
    });
  });

  describe('validateInvariants', () => {
    // Happy path tests
    it('should pass validation for valid usage limit', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      expect(() => {
        UsageLimitContracts.validateInvariants(usageLimit);
      }).not.toThrow();
    });

    it('should pass validation after recording usage', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      usageLimit.recordUsage();

      expect(() => {
        UsageLimitContracts.validateInvariants(usageLimit);
      }).not.toThrow();
    });

    it('should pass validation after adding bonus quota', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      usageLimit.addBonusQuota(BonusType.QUESTIONNAIRE, 5);

      expect(() => {
        UsageLimitContracts.validateInvariants(usageLimit);
      }).not.toThrow();
    });

    // Precondition validation tests
    it('should throw error when usage limit is null', () => {
      expect(() => {
        UsageLimitContracts.validateInvariants(null as any);
      }).toThrow('UsageLimit instance is required for invariant validation');
    });

    // Edge cases
    it('should validate complex usage scenarios', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(ip, policy);

      usageLimit.addBonusQuota(BonusType.PAYMENT, 10);
      usageLimit.recordUsage();
      usageLimit.recordUsage();

      expect(() => {
        UsageLimitContracts.validateInvariants(usageLimit);
      }).not.toThrow();
    });
  });

  describe('performanceContract', () => {
    // Happy path tests
    it('should execute operation within time limit', () => {
      const fastOperation = () => 'result';

      const result = UsageLimitContracts.performanceContract(
        fastOperation,
        100,
        'FastOperation',
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
        UsageLimitContracts.performanceContract(
          slowOperation,
          100,
          'SlowOperation',
        );
      }).toThrow('Performance contract violation');
    });

    it('should propagate errors from the operation', () => {
      const failingOperation = () => {
        throw new Error('Operation failed');
      };

      expect(() => {
        UsageLimitContracts.performanceContract(
          failingOperation,
          100,
          'FailingOperation',
        );
      }).toThrow('Operation failed');
    });

    // Edge cases
    it('should handle operations at exact time limit', () => {
      const edgeOperation = () => {
        const start = Date.now();
        while (Date.now() - start < 50) {
          // Busy wait
        }
        return 'result';
      };

      // Should succeed with 100ms limit
      expect(() => {
        UsageLimitContracts.performanceContract(
          edgeOperation,
          100,
          'EdgeOperation',
        );
      }).not.toThrow();
    });

    it('should use default parameters when not provided', () => {
      const operation = () => 'result';

      expect(() => {
        UsageLimitContracts.performanceContract(operation);
      }).not.toThrow();
    });

    it('should handle complex return types', () => {
      const complexOperation = () => ({ data: [1, 2, 3], status: 'success' });

      const result = UsageLimitContracts.performanceContract(
        complexOperation,
        100,
        'ComplexOperation',
      );

      expect(result).toEqual({ data: [1, 2, 3], status: 'success' });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete usage lifecycle', () => {
      const ip = '192.168.1.1';
      const policy = UsageLimitPolicy.createDefault();

      // Create
      const usageLimit = UsageLimitContracts.createUsageLimit(ip, policy);
      expect(usageLimit).toBeDefined();

      // Check
      const checkResult = UsageLimitContracts.checkUsageLimit(ip, usageLimit);
      expect(checkResult.isAllowed()).toBe(true);

      // Record
      const recordResult = UsageLimitContracts.recordUsage(ip, usageLimit);
      expect(recordResult.isSuccess()).toBe(true);

      // Add bonus
      UsageLimitContracts.addBonusQuota(
        ip,
        usageLimit,
        BonusType.QUESTIONNAIRE,
        5,
      );

      // Validate
      expect(() => {
        UsageLimitContracts.validateInvariants(usageLimit);
      }).not.toThrow();
    });

    it('should enforce all preconditions and postconditions in sequence', () => {
      const ip = '10.0.0.1';
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimitContracts.createUsageLimit(ip, policy);

      // Perform multiple operations
      for (let i = 0; i < 3; i++) {
        const result = UsageLimitContracts.recordUsage(ip, usageLimit);
        expect(result.isSuccess()).toBe(true);
        UsageLimitContracts.validateInvariants(usageLimit);
      }

      const finalCheck = UsageLimitContracts.checkUsageLimit(ip, usageLimit);
      expect(finalCheck.getRemainingQuota()).toBe(2);
    });
  });
});
