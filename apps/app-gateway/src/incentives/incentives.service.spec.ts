import { IncentivesService } from './incentives.service';

describe('IncentivesService', () => {
  let service: IncentivesService;

  beforeEach(() => {
    service = new IncentivesService();
  });

  describe('createQuestionnaireIncentive', () => {
    it('should create incentive with correct amount based on quality score', () => {
      const result = service.createQuestionnaireIncentive({
        questionnaireId: 'q-123',
        qualityScore: 80,
      });

      expect(result.incentiveId).toMatch(/^inc-[a-f0-9]{12}$/);
      expect(result.rewardAmount).toBe(8);
      expect(result.status).toBe('pending');
      expect(result.createdAt).toBeDefined();
    });

    it('should create incentive with default quality score of 80', () => {
      const result = service.createQuestionnaireIncentive({
        questionnaireId: 'q-123',
      });

      expect(result.rewardAmount).toBe(8);
    });

    it('should calculate correct amount for different quality scores', () => {
      const result50 = service.createQuestionnaireIncentive({
        questionnaireId: 'q-1',
        qualityScore: 50,
      });
      expect(result50.rewardAmount).toBe(5);

      const result100 = service.createQuestionnaireIncentive({
        questionnaireId: 'q-2',
        qualityScore: 100,
      });
      expect(result100.rewardAmount).toBe(10);
    });

    it('should set minimum amount of 1', () => {
      const result = service.createQuestionnaireIncentive({
        questionnaireId: 'q-1',
        qualityScore: 1,
      });

      expect(result.rewardAmount).toBe(1);
    });

    it('should validate created incentive exists', () => {
      const created = service.createQuestionnaireIncentive({
        questionnaireId: 'q-123',
      });

      expect(service.validateIncentive(created.incentiveId)).toBe(true);
    });

    it('should store metadata with incentive', () => {
      const metadata = { userId: 'user-1', source: 'test' };
      service.createQuestionnaireIncentive({
        questionnaireId: 'q-123',
        metadata,
      });

      const stats = service.getOverviewStats();
      expect(stats.totalIncentives).toBe(1);
    });
  });

  describe('validateIncentive', () => {
    it('should return false for non-existent incentive', () => {
      expect(service.validateIncentive('non-existent-id')).toBe(false);
    });

    it('should return true for existing incentive', () => {
      const created = service.createQuestionnaireIncentive({
        questionnaireId: 'q-123',
      });

      expect(service.validateIncentive(created.incentiveId)).toBe(true);
    });
  });

  describe('approveIncentive', () => {
    it('should approve existing incentive', () => {
      const created = service.createQuestionnaireIncentive({
        questionnaireId: 'q-123',
      });

      const result = service.approveIncentive(created.incentiveId, {});

      expect(result.approvalStatus).toBe('approved');
      expect(result.approvedAt).toBeDefined();
    });

    it('should create placeholder for non-existent incentive and approve it', () => {
      const result = service.approveIncentive('non-existent-id', {});

      expect(result.approvalStatus).toBe('approved');
    });

    it('should update stats after approval', () => {
      const created = service.createQuestionnaireIncentive({
        questionnaireId: 'q-123',
      });
      service.approveIncentive(created.incentiveId, {});

      const stats = service.getOverviewStats();
      expect(stats.approved).toBe(1);
      expect(stats.pending).toBe(0);
    });
  });

  describe('getOverviewStats', () => {
    it('should return zero stats for empty service', () => {
      const stats = service.getOverviewStats();

      expect(stats.totalRewards).toBe(0);
      expect(stats.totalIncentives).toBe(0);
      expect(stats.approved).toBe(0);
      expect(stats.pending).toBe(0);
    });

    it('should aggregate multiple incentives correctly', () => {
      service.createQuestionnaireIncentive({
        questionnaireId: 'q-1',
        qualityScore: 80,
      });
      service.createQuestionnaireIncentive({
        questionnaireId: 'q-2',
        qualityScore: 60,
      });
      service.createQuestionnaireIncentive({
        questionnaireId: 'q-3',
        qualityScore: 100,
      });

      const stats = service.getOverviewStats();

      expect(stats.totalIncentives).toBe(3);
      expect(stats.totalRewards).toBe(8 + 6 + 10);
      expect(stats.pending).toBe(3);
      expect(stats.approved).toBe(0);
    });

    it('should track approved vs pending correctly', () => {
      const inc1 = service.createQuestionnaireIncentive({
        questionnaireId: 'q-1',
      });
      service.createQuestionnaireIncentive({ questionnaireId: 'q-2' });

      service.approveIncentive(inc1.incentiveId, {});

      const stats = service.getOverviewStats();
      expect(stats.approved).toBe(1);
      expect(stats.pending).toBe(1);
    });
  });
});
