import { RewardsController } from './rewards.controller';

describe('RewardsController', () => {
  let controller: RewardsController;

  beforeEach(() => {
    controller = new RewardsController({} as any);
  });

  describe('getRewards', () => {
    it('should get user rewards', async () => {
      const result = await controller.getRewards('user-123');

      expect(result).toHaveProperty('rewards');
    });
  });

  describe('claimReward', () => {
    it('should claim reward', async () => {
      const result = await controller.claimReward('reward-123');

      expect(result).toHaveProperty('claimed');
    });
  });
});
