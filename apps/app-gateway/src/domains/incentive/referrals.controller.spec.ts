import { ReferralsController } from './referrals.controller';

describe('ReferralsController', () => {
  let controller: ReferralsController;

  beforeEach(() => {
    controller = new ReferralsController({} as any);
  });

  describe('createReferral', () => {
    it('should create referral', async () => {
      const result = await controller.createReferral({
        refereeId: 'user-123',
      } as any);

      expect(result).toHaveProperty('referralId');
    });
  });

  describe('getReferralStatus', () => {
    it('should get referral status', async () => {
      const result = await controller.getReferralStatus('ref-123');

      expect(result).toHaveProperty('status');
    });
  });
});
