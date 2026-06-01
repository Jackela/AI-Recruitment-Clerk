import { IncentivesController } from './incentives.controller';
import { IncentivesService } from './incentives.service';

describe('IncentivesController', () => {
  let controller: IncentivesController;
  let service: IncentivesService;

  beforeEach(() => {
    service = new IncentivesService();
    controller = new IncentivesController(service);
  });

  describe('create', () => {
    it('should create incentive and return formatted response', () => {
      const result = controller.create({
        questionnaireId: 'q-123',
        qualityScore: 80,
      });

      expect(result.incentiveId).toMatch(/^inc-/);
      expect(result.rewardAmount).toBe(8);
      expect(result.currency).toBe('USD');
      expect(result.status).toBe('pending');
      expect(result.canBePaid).toBe(false);
      expect(result.createdAt).toBeDefined();
    });

    it('should set canBePaid to true for approved incentives', () => {
      const created = controller.create({
        questionnaireId: 'q-123',
      });

      controller.approve(created.incentiveId, {});

      const validated = controller.validate(created.incentiveId);
      expect(validated.isValid).toBe(true);
    });
  });

  describe('validate', () => {
    it('should return isValid true for existing incentive', () => {
      const created = controller.create({ questionnaireId: 'q-123' });

      const result = controller.validate(created.incentiveId);

      expect(result.isValid).toBe(true);
    });

    it('should return isValid false for non-existent incentive', () => {
      const result = controller.validate('non-existent');

      expect(result.isValid).toBe(false);
    });
  });

  describe('approve', () => {
    it('should approve incentive and return status', () => {
      const created = controller.create({ questionnaireId: 'q-123' });

      const result = controller.approve(created.incentiveId, {});

      expect(result.approvalStatus).toBe('approved');
      expect(result.approvedAt).toBeDefined();
    });
  });

  describe('stats', () => {
    it('should return overview stats', () => {
      controller.create({ questionnaireId: 'q-1' });
      controller.create({ questionnaireId: 'q-2' });

      const result = controller.stats();

      expect(result.overview.totalIncentives).toBe(2);
      expect(result.overview.totalRewards).toBe(16);
    });

    it('should handle timeRange query parameter', () => {
      const result = controller.stats('7d');

      expect(result.overview).toBeDefined();
    });
  });
});
