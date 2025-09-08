import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboardData', () => {
    it('should return dashboard analytics data', async () => {
      const result = await controller.getDashboardData();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.totalJobs).toBeDefined();
      expect(result.data.activeJobs).toBeDefined();
      expect(result.data.totalApplications).toBeDefined();
      expect(result.data.pendingReview).toBeDefined();
      expect(result.data.matchingRate).toBeDefined();
      expect(result.data.avgProcessingTime).toBeDefined();
      expect(result.data.improvementRate).toBeDefined();
      expect(result.data.topSkills).toBeDefined();
      expect(Array.isArray(result.data.topSkills)).toBe(true);
      expect(result.data.recruitmentFunnel).toBeDefined();
      expect(result.data.monthlyTrends).toBeDefined();
      expect(result.data.recentActivity).toBeDefined();
      expect(Array.isArray(result.data.recentActivity)).toBe(true);
      expect(result.data.source).toBe('nestjs-analytics');
      expect(result.data.lastUpdated).toBeDefined();
    });

    it('should return valid data structure', async () => {
      const result = await controller.getDashboardData();

      // Verify top skills structure
      result.data.topSkills.forEach((skill: any) => {
        expect(skill).toHaveProperty('name');
        expect(skill).toHaveProperty('demand');
        expect(skill).toHaveProperty('growth');
        expect(typeof skill.name).toBe('string');
        expect(typeof skill.demand).toBe('number');
        expect(typeof skill.growth).toBe('string');
      });

      // Verify recruitment funnel structure
      expect(result.data.recruitmentFunnel).toHaveProperty('applied');
      expect(result.data.recruitmentFunnel).toHaveProperty('screened');
      expect(result.data.recruitmentFunnel).toHaveProperty('interviewed');
      expect(result.data.recruitmentFunnel).toHaveProperty('offered');
      expect(result.data.recruitmentFunnel).toHaveProperty('accepted');

      // Verify monthly trends structure
      expect(result.data.monthlyTrends).toHaveProperty('applications');
      expect(result.data.monthlyTrends).toHaveProperty('hires');
      expect(result.data.monthlyTrends).toHaveProperty('satisfaction');
      expect(Array.isArray(result.data.monthlyTrends.applications)).toBe(true);
      expect(Array.isArray(result.data.monthlyTrends.hires)).toBe(true);
      expect(Array.isArray(result.data.monthlyTrends.satisfaction)).toBe(true);

      // Verify recent activity structure
      result.data.recentActivity.forEach((activity: any) => {
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('candidate');
        expect(activity).toHaveProperty('position');
        expect(activity).toHaveProperty('time');
        expect(typeof activity.type).toBe('string');
        expect(typeof activity.candidate).toBe('string');
        expect(typeof activity.position).toBe('string');
        expect(typeof activity.time).toBe('string');
      });
    });

    it('should return numeric values for metrics', async () => {
      const result = await controller.getDashboardData();

      expect(typeof result.data.totalJobs).toBe('number');
      expect(typeof result.data.activeJobs).toBe('number');
      expect(typeof result.data.totalApplications).toBe('number');
      expect(typeof result.data.pendingReview).toBe('number');
      expect(typeof result.data.matchingRate).toBe('number');
      expect(result.data.totalJobs).toBeGreaterThanOrEqual(0);
      expect(result.data.activeJobs).toBeGreaterThanOrEqual(0);
      expect(result.data.totalApplications).toBeGreaterThanOrEqual(0);
      expect(result.data.pendingReview).toBeGreaterThanOrEqual(0);
      expect(result.data.matchingRate).toBeGreaterThanOrEqual(0);
    });

    it('should return valid ISO timestamp for lastUpdated', async () => {
      const result = await controller.getDashboardData();

      const timestamp = result.data.lastUpdated;
      expect(timestamp).toBeDefined();
      expect(typeof timestamp).toBe('string');

      // Verify it's a valid ISO timestamp
      const date = new Date(timestamp);
      expect(date.toISOString()).toBe(timestamp);
    });
  });
});
