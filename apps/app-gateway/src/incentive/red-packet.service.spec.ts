import { RedPacketService } from './red-packet.service';

describe('RedPacketService', () => {
  let service: RedPacketService;

  beforeEach(() => {
    service = new RedPacketService();
  });

  describe('processQuestionnaireReward', () => {
    it('should successfully process questionnaire reward', async () => {
      const result = await service.processQuestionnaireReward({
        ip: '192.168.1.1',
        questionnaireId: 'q-123',
        userContact: {
          type: 'wechat',
          account: 'wechat123',
        },
        feedbackQuality: 'basic',
      });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(5);
      expect(result.message).toContain('5元红包已发送');
      expect(result.redPacketId).toMatch(/^rp_/);
    });

    it('should add quality bonus for detailed feedback', async () => {
      const result = await service.processQuestionnaireReward({
        ip: '192.168.1.2',
        questionnaireId: 'q-123',
        userContact: {
          type: 'alipay',
          account: 'alipay123',
        },
        feedbackQuality: 'detailed',
      });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(8);
    });

    it('should reject when daily limit exceeded', async () => {
      await service.processQuestionnaireReward({
        ip: '192.168.1.3',
        questionnaireId: 'q-1',
        userContact: { type: 'wechat', account: 'w1' },
      });

      const result = await service.processQuestionnaireReward({
        ip: '192.168.1.3',
        questionnaireId: 'q-2',
        userContact: { type: 'wechat', account: 'w2' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DAILY_LIMIT_EXCEEDED');
    });
  });

  describe('processReferralReward', () => {
    it('should process referral reward for both parties', async () => {
      const result = await service.processReferralReward({
        referrerIP: '10.0.0.1',
        refereeIP: '10.0.0.2',
        refereeQuestionnaireId: 'q-123',
        contacts: {
          referrer: { type: 'wechat', account: 'ref_wechat' },
          referee: { type: 'alipay', account: 'refe_alipay' },
        },
      });

      expect(result.success).toBe(true);
      expect(result.rewards.referrer.amount).toBe(2);
      expect(result.rewards.referee.amount).toBe(2);
      expect(result.message).toContain('推荐成功');
    });
  });

  describe('getRedPacketStats', () => {
    it('should return stats with zero values when no records', async () => {
      const result = await service.getRedPacketStats();

      expect(result.totalSent).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.successRate).toBe(0);
      expect(result.budgetUsage.used).toBe(0);
    });

    it('should return stats for specific date', async () => {
      const today = new Date().toISOString().split('T')[0];
      const result = await service.getRedPacketStats(today);

      expect(result.date).toBe(today);
    });
  });
});
