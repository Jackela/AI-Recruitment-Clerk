import { IncentiveCalculationsService } from './incentive-calculations.service';
import {
  Incentive,
  IncentiveStatus,
  ContactInfo,
} from './incentive';

describe('IncentiveCalculationsService', () => {
  let service: IncentiveCalculationsService;

  // Helper to create incentive with specific status
  const createIncentiveWithStatus = (
    ip: string,
    status: IncentiveStatus,
    qualityScore = 85,
  ): Incentive => {
    const contactInfo = new ContactInfo({ email: `${ip}@example.com` });

    if (status === IncentiveStatus.REJECTED) {
      // Create incentive and reject it
      const incentive = Incentive.createQuestionnaireIncentive(
        ip,
        `quest_${Date.now()}`,
        qualityScore,
        contactInfo,
      );
      incentive.reject('Test rejection');
      return incentive;
    }

    // For other statuses, create normally (auto-approved for high quality)
    // or handle manually based on status
    if (status === IncentiveStatus.PENDING_VALIDATION) {
      // Low quality score keeps it in pending
      return Incentive.createQuestionnaireIncentive(
        ip,
        `quest_${Date.now()}`,
        50, // Below 70, stays pending
        contactInfo,
      );
    }

    if (status === IncentiveStatus.APPROVED) {
      // High quality auto-approves
      return Incentive.createQuestionnaireIncentive(
        ip,
        `quest_${Date.now()}`,
        85,
        contactInfo,
      );
    }

    // For PAID status, create approved and execute payment
    const incentive = Incentive.createQuestionnaireIncentive(
      ip,
      `quest_${Date.now()}`,
      85,
      contactInfo,
    );
    incentive.executePayment(
      'wechat_pay' as any,
      `txn_${Date.now()}`,
    );
    return incentive;
  };

  beforeEach(() => {
    service = new IncentiveCalculationsService();
  });

  describe('calculateIPStatistics', () => {
    it('should return zero statistics for empty incentives array', () => {
      const result = service.calculateIPStatistics('192.168.1.1', []);

      expect(result.ip).toBe('192.168.1.1');
      expect(result.totalIncentives).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.paidAmount).toBe(0);
      expect(result.pendingAmount).toBe(0);
      expect(result.averageReward).toBe(0);
      expect(result.lastIncentiveDate).toBeUndefined();
      expect(result.statusBreakdown).toEqual({
        pending: 0,
        approved: 0,
        paid: 0,
        rejected: 0,
      });
    });

    it('should calculate statistics for single pending incentive', () => {
      const incentive = createIncentiveWithStatus(
        '192.168.1.1',
        IncentiveStatus.PENDING_VALIDATION,
        50,
      );
      const result = service.calculateIPStatistics('192.168.1.1', [incentive]);

      expect(result.totalIncentives).toBe(1);
      expect(result.statusBreakdown.pending).toBe(1);
      expect(result.statusBreakdown.approved).toBe(0);
      expect(result.statusBreakdown.paid).toBe(0);
      expect(result.statusBreakdown.rejected).toBe(0);
      expect(result.averageReward).toBeGreaterThan(0);
      expect(result.lastIncentiveDate).toBeDefined();
    });

    it('should calculate statistics for single approved incentive', () => {
      const incentive = createIncentiveWithStatus(
        '192.168.1.1',
        IncentiveStatus.APPROVED,
        85,
      );
      const result = service.calculateIPStatistics('192.168.1.1', [incentive]);

      expect(result.totalIncentives).toBe(1);
      expect(result.statusBreakdown.pending).toBe(0);
      expect(result.statusBreakdown.approved).toBe(1);
      expect(result.pendingAmount).toBeGreaterThan(0);
      expect(result.paidAmount).toBe(0);
    });

    it('should calculate statistics for single paid incentive', () => {
      const incentive = createIncentiveWithStatus(
        '192.168.1.1',
        IncentiveStatus.PAID,
        85,
      );
      const result = service.calculateIPStatistics('192.168.1.1', [incentive]);

      expect(result.totalIncentives).toBe(1);
      expect(result.statusBreakdown.paid).toBe(1);
      expect(result.paidAmount).toBeGreaterThan(0);
      expect(result.pendingAmount).toBe(0);
    });

    it('should calculate statistics for single rejected incentive', () => {
      const incentive = createIncentiveWithStatus(
        '192.168.1.1',
        IncentiveStatus.REJECTED,
        85,
      );
      const result = service.calculateIPStatistics('192.168.1.1', [incentive]);

      expect(result.totalIncentives).toBe(1);
      expect(result.statusBreakdown.rejected).toBe(1);
    });

    it('should calculate statistics for multiple incentives with mixed statuses', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.PENDING_VALIDATION, 50),
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.PAID, 90),
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.REJECTED, 60),
      ];

      const result = service.calculateIPStatistics('192.168.1.1', incentives);

      expect(result.totalIncentives).toBe(4);
      expect(result.statusBreakdown.pending).toBe(1);
      expect(result.statusBreakdown.approved).toBe(1);
      expect(result.statusBreakdown.paid).toBe(1);
      expect(result.statusBreakdown.rejected).toBe(1);
      expect(result.totalAmount).toBeGreaterThan(0);
    });

    it('should calculate average reward correctly', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
      ];

      const result = service.calculateIPStatistics('192.168.1.1', incentives);

      expect(result.averageReward).toBe(result.totalAmount / 2);
    });

    it('should return correct lastIncentiveDate (most recent)', async () => {
      // Create incentives at different times
      const olderIncentive = createIncentiveWithStatus(
        '192.168.1.1',
        IncentiveStatus.APPROVED,
        85,
      );

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const newerIncentive = createIncentiveWithStatus(
        '192.168.1.1',
        IncentiveStatus.APPROVED,
        85,
      );

      const result = service.calculateIPStatistics('192.168.1.1', [
        olderIncentive,
        newerIncentive,
      ]);

      expect(result.lastIncentiveDate).toBeDefined();
      expect(result.lastIncentiveDate).toBe(
        newerIncentive.getCreatedAt().getTime(),
      );
    });

    it('should accumulate amounts correctly across incentives', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
      ];

      const result = service.calculateIPStatistics('192.168.1.1', incentives);

      const expectedTotal = incentives.reduce(
        (sum, inc) => sum + inc.getRewardAmount(),
        0,
      );
      expect(result.totalAmount).toBe(expectedTotal);
    });
  });

  describe('calculateSystemStatistics', () => {
    it('should return zero statistics for empty incentives array', () => {
      const result = service.calculateSystemStatistics([]);

      expect(result.totalIncentives).toBe(0);
      expect(result.uniqueRecipients).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.paidAmount).toBe(0);
      expect(result.pendingAmount).toBe(0);
      expect(result.averageRewardPerIncentive).toBe(0);
      expect(result.averageRewardPerIP).toBe(0);
      expect(result.conversionRate).toBe(0);
      expect(result.statusBreakdown).toEqual({
        pending: 0,
        approved: 0,
        paid: 0,
        rejected: 0,
      });
    });

    it('should calculate statistics for single incentive', () => {
      const incentive = createIncentiveWithStatus(
        '192.168.1.1',
        IncentiveStatus.APPROVED,
        85,
      );
      const result = service.calculateSystemStatistics([incentive]);

      expect(result.totalIncentives).toBe(1);
      expect(result.uniqueRecipients).toBe(1);
      expect(result.averageRewardPerIncentive).toBe(incentive.getRewardAmount());
      expect(result.averageRewardPerIP).toBe(incentive.getRewardAmount());
    });

    it('should count unique IPs correctly', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.APPROVED, 85),
      ];

      const result = service.calculateSystemStatistics(incentives);

      expect(result.uniqueRecipients).toBe(3);
    });

    it('should calculate paid amount only for PAID status', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.PAID, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.PENDING_VALIDATION, 50),
      ];

      const result = service.calculateSystemStatistics(incentives);

      const paidIncentive = incentives.find(
        (i) => i.getStatus() === IncentiveStatus.PAID,
      );
      expect(result.paidAmount).toBe(paidIncentive!.getRewardAmount());
    });

    it('should calculate pending amount as total minus paid', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.PAID, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.PENDING_VALIDATION, 50),
      ];

      const result = service.calculateSystemStatistics(incentives);

      expect(result.pendingAmount).toBe(result.totalAmount - result.paidAmount);
    });

    it('should calculate conversion rate correctly', () => {
      // Create 2 paid and 2 non-paid incentives = 50% conversion
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.PAID, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.PAID, 85),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.4', IncentiveStatus.PENDING_VALIDATION, 50),
      ];

      const result = service.calculateSystemStatistics(incentives);

      expect(result.conversionRate).toBe(50); // 2 paid out of 4 = 50%
    });

    it('should return 0 conversion rate for empty incentives', () => {
      const result = service.calculateSystemStatistics([]);

      expect(result.conversionRate).toBe(0);
    });

    it('should calculate average reward per IP correctly', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
      ];

      const result = service.calculateSystemStatistics(incentives);

      const totalAmount = incentives.reduce(
        (sum, i) => sum + i.getRewardAmount(),
        0,
      );
      expect(result.averageRewardPerIP).toBe(totalAmount / 2); // 2 unique IPs
    });

    it('should count status breakdown correctly', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.PENDING_VALIDATION, 50),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.PAID, 90),
        createIncentiveWithStatus('192.168.1.4', IncentiveStatus.REJECTED, 60),
        createIncentiveWithStatus('192.168.1.5', IncentiveStatus.PAID, 85),
      ];

      const result = service.calculateSystemStatistics(incentives);

      expect(result.statusBreakdown.pending).toBe(1);
      expect(result.statusBreakdown.approved).toBe(1);
      expect(result.statusBreakdown.paid).toBe(2);
      expect(result.statusBreakdown.rejected).toBe(1);
    });

    it('should handle all incentives with same status', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.APPROVED, 85),
      ];

      const result = service.calculateSystemStatistics(incentives);

      expect(result.statusBreakdown.approved).toBe(3);
      expect(result.statusBreakdown.pending).toBe(0);
      expect(result.statusBreakdown.paid).toBe(0);
      expect(result.statusBreakdown.rejected).toBe(0);
      expect(result.conversionRate).toBe(0); // No paid incentives
    });
  });

  describe('calculateTotalAmount', () => {
    it('should return 0 for empty array', () => {
      const result = service.calculateTotalAmount([]);

      expect(result).toBe(0);
    });

    it('should calculate total for single incentive', () => {
      const incentive = createIncentiveWithStatus(
        '192.168.1.1',
        IncentiveStatus.APPROVED,
        85,
      );
      const result = service.calculateTotalAmount([incentive]);

      expect(result).toBe(incentive.getRewardAmount());
    });

    it('should calculate total for multiple incentives', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.APPROVED, 85),
      ];
      const result = service.calculateTotalAmount(incentives);

      const expected = incentives.reduce(
        (sum, i) => sum + i.getRewardAmount(),
        0,
      );
      expect(result).toBe(expected);
    });

    it('should sum amounts regardless of status', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.PAID, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.REJECTED, 60),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.PENDING_VALIDATION, 50),
      ];
      const result = service.calculateTotalAmount(incentives);

      const expected = incentives.reduce(
        (sum, i) => sum + i.getRewardAmount(),
        0,
      );
      expect(result).toBe(expected);
    });
  });

  describe('filterByStatus', () => {
    it('should return empty array for empty input', () => {
      const result = service.filterByStatus([], IncentiveStatus.APPROVED);

      expect(result).toEqual([]);
    });

    it('should filter by PENDING_VALIDATION status', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.PENDING_VALIDATION, 50),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.PENDING_VALIDATION, 45),
      ];

      const result = service.filterByStatus(incentives, IncentiveStatus.PENDING_VALIDATION);

      expect(result.length).toBe(2);
      expect(result.every((i) => i.getStatus() === IncentiveStatus.PENDING_VALIDATION)).toBe(true);
    });

    it('should filter by APPROVED status', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.PAID, 90),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.APPROVED, 80),
      ];

      const result = service.filterByStatus(incentives, IncentiveStatus.APPROVED);

      expect(result.length).toBe(2);
      expect(result.every((i) => i.getStatus() === IncentiveStatus.APPROVED)).toBe(true);
    });

    it('should filter by PAID status', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.PAID, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.PAID, 90),
      ];

      const result = service.filterByStatus(incentives, IncentiveStatus.PAID);

      expect(result.length).toBe(2);
      expect(result.every((i) => i.getStatus() === IncentiveStatus.PAID)).toBe(true);
    });

    it('should filter by REJECTED status', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.REJECTED, 60),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.REJECTED, 55),
      ];

      const result = service.filterByStatus(incentives, IncentiveStatus.REJECTED);

      expect(result.length).toBe(2);
      expect(result.every((i) => i.getStatus() === IncentiveStatus.REJECTED)).toBe(true);
    });

    it('should return empty array when no incentives match status', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
      ];

      const result = service.filterByStatus(incentives, IncentiveStatus.PAID);

      expect(result).toEqual([]);
    });
  });

  describe('getUniqueIPs', () => {
    it('should return empty set for empty array', () => {
      const result = service.getUniqueIPs([]);

      expect(result.size).toBe(0);
    });

    it('should return unique IPs for single incentive', () => {
      const incentive = createIncentiveWithStatus(
        '192.168.1.1',
        IncentiveStatus.APPROVED,
        85,
      );
      const result = service.getUniqueIPs([incentive]);

      expect(result.size).toBe(1);
      expect(result.has('192.168.1.1')).toBe(true);
    });

    it('should return unique IPs for multiple incentives with same IP', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.PAID, 85),
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
      ];
      const result = service.getUniqueIPs(incentives);

      expect(result.size).toBe(1);
      expect(result.has('192.168.1.1')).toBe(true);
    });

    it('should return unique IPs for incentives with different IPs', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.APPROVED, 85),
      ];
      const result = service.getUniqueIPs(incentives);

      expect(result.size).toBe(3);
      expect(result.has('192.168.1.1')).toBe(true);
      expect(result.has('192.168.1.2')).toBe(true);
      expect(result.has('192.168.1.3')).toBe(true);
    });

    it('should return Set type', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
      ];
      const result = service.getUniqueIPs(incentives);

      expect(result).toBeInstanceOf(Set);
    });
  });

  describe('calculateAverageReward', () => {
    it('should return 0 for empty array', () => {
      const result = service.calculateAverageReward([]);

      expect(result).toBe(0);
    });

    it('should calculate average for single incentive', () => {
      const incentive = createIncentiveWithStatus(
        '192.168.1.1',
        IncentiveStatus.APPROVED,
        85,
      );
      const result = service.calculateAverageReward([incentive]);

      expect(result).toBe(incentive.getRewardAmount());
    });

    it('should calculate average for multiple incentives', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
      ];
      const result = service.calculateAverageReward(incentives);

      const total = incentives.reduce((sum, i) => sum + i.getRewardAmount(), 0);
      expect(result).toBe(total / 2);
    });

    it('should calculate average for mixed amounts', () => {
      // Using different quality scores to get different amounts
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 90),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.APPROVED, 95),
      ];
      const result = service.calculateAverageReward(incentives);

      const total = incentives.reduce((sum, i) => sum + i.getRewardAmount(), 0);
      expect(result).toBe(total / 3);
    });

    it('should return 0 for empty array without throwing', () => {
      expect(() => service.calculateAverageReward([])).not.toThrow();
      expect(service.calculateAverageReward([])).toBe(0);
    });
  });

  describe('calculateConversionRate', () => {
    it('should return 0 for empty array', () => {
      const result = service.calculateConversionRate([]);

      expect(result).toBe(0);
    });

    it('should return 0 when no incentives are paid', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.PENDING_VALIDATION, 50),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.REJECTED, 60),
      ];
      const result = service.calculateConversionRate(incentives);

      expect(result).toBe(0);
    });

    it('should return 100 when all incentives are paid', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.PAID, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.PAID, 90),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.PAID, 85),
      ];
      const result = service.calculateConversionRate(incentives);

      expect(result).toBe(100);
    });

    it('should calculate partial conversion rate correctly', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.PAID, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.PENDING_VALIDATION, 50),
        createIncentiveWithStatus('192.168.1.4', IncentiveStatus.REJECTED, 60),
      ];
      const result = service.calculateConversionRate(incentives);

      expect(result).toBe(25); // 1 paid out of 4 = 25%
    });

    it('should calculate 50% conversion rate', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.PAID, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
      ];
      const result = service.calculateConversionRate(incentives);

      expect(result).toBe(50);
    });

    it('should calculate 33.33% conversion rate with precision', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.PAID, 85),
        createIncentiveWithStatus('192.168.1.2', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.3', IncentiveStatus.PENDING_VALIDATION, 50),
      ];
      const result = service.calculateConversionRate(incentives);

      expect(result).toBeCloseTo(33.33, 1);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle incentives with same timestamp for lastIncentiveDate', () => {
      // Create incentives at the "same" time (within same millisecond)
      const incentive1 = createIncentiveWithStatus(
        '192.168.1.1',
        IncentiveStatus.APPROVED,
        85,
      );
      const incentive2 = createIncentiveWithStatus(
        '192.168.1.1',
        IncentiveStatus.APPROVED,
        85,
      );

      const result = service.calculateIPStatistics('192.168.1.1', [
        incentive1,
        incentive2,
      ]);

      expect(result.lastIncentiveDate).toBeDefined();
      // Should return one of the timestamps (doesn't matter which when they're equal)
      const timestamps = [
        incentive1.getCreatedAt().getTime(),
        incentive2.getCreatedAt().getTime(),
      ];
      expect(timestamps).toContain(result.lastIncentiveDate);
    });

    it('should handle very large number of incentives', () => {
      const incentives: Incentive[] = [];
      for (let i = 0; i < 100; i++) {
        incentives.push(
          createIncentiveWithStatus(
            `192.168.1.${i % 10}`, // 10 unique IPs
            IncentiveStatus.APPROVED,
            85,
          ),
        );
      }

      const ipResult = service.calculateIPStatistics('192.168.1.1', incentives);
      const systemResult = service.calculateSystemStatistics(incentives);

      expect(ipResult.totalIncentives).toBe(100);
      expect(systemResult.totalIncentives).toBe(100);
      expect(systemResult.uniqueRecipients).toBe(10);
    });

    it('should handle referral incentives in calculations', () => {
      const contactInfo = new ContactInfo({ email: 'test@example.com' });
      const referralIncentive = Incentive.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        contactInfo,
      );

      const result = service.calculateIPStatistics('192.168.1.1', [referralIncentive]);

      expect(result.totalIncentives).toBe(1);
      expect(result.totalAmount).toBeGreaterThan(0);
    });

    it('should correctly sum pending amounts for PENDING and APPROVED statuses', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.PENDING_VALIDATION, 50),
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
      ];

      const result = service.calculateIPStatistics('192.168.1.1', incentives);

      // Pending amount should include both PENDING and APPROVED
      const expectedPending =
        incentives[0].getRewardAmount() + incentives[1].getRewardAmount();
      expect(result.pendingAmount).toBe(expectedPending);
    });

    it('should not include REJECTED incentives in pending amount', () => {
      const incentives = [
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.APPROVED, 85),
        createIncentiveWithStatus('192.168.1.1', IncentiveStatus.REJECTED, 60),
      ];

      const result = service.calculateIPStatistics('192.168.1.1', incentives);

      // Only APPROVED should be in pending amount, not REJECTED
      expect(result.pendingAmount).toBe(incentives[0].getRewardAmount());
    });
  });

  describe('Integration with Incentive entity', () => {
    it('should work with real Incentive aggregate root behavior', () => {
      // Create a realistic scenario
      const contactInfo = new ContactInfo({
        email: 'user@example.com',
        wechat: 'user_wechat',
      });

      // Create questionnaire incentive with high quality (auto-approves)
      const highQualityIncentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_high',
        95,
        contactInfo,
      );

      // Create referral incentive
      const referralIncentive = Incentive.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.100',
        contactInfo,
      );

      const incentives = [highQualityIncentive, referralIncentive];

      const ipStats = service.calculateIPStatistics('192.168.1.1', incentives);
      const systemStats = service.calculateSystemStatistics(incentives);

      // Verify IP statistics
      expect(ipStats.ip).toBe('192.168.1.1');
      expect(ipStats.totalIncentives).toBe(2);
      expect(ipStats.averageReward).toBeGreaterThan(0);

      // Verify system statistics
      expect(systemStats.totalIncentives).toBe(2);
      expect(systemStats.uniqueRecipients).toBe(1);
    });

    it('should handle incentive lifecycle correctly in statistics', async () => {
      const contactInfo = new ContactInfo({ wechat: 'test_wechat' });

      // Create incentive that gets paid
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'quest_lifecycle',
        85,
        contactInfo,
      );

      // Initial statistics (should be APPROVED due to high quality)
      let stats = service.calculateIPStatistics('192.168.1.1', [incentive]);
      expect(stats.statusBreakdown.approved).toBe(1);
      expect(stats.pendingAmount).toBeGreaterThan(0);

      // Execute payment
      const paymentResult = incentive.executePayment(
        'wechat_pay' as any,
        'txn_12345',
      );
      expect(paymentResult.success).toBe(true);

      // Statistics after payment
      stats = service.calculateIPStatistics('192.168.1.1', [incentive]);
      expect(stats.statusBreakdown.paid).toBe(1);
      expect(stats.paidAmount).toBeGreaterThan(0);
      expect(stats.pendingAmount).toBe(0);
    });
  });
});
