import { FeatureNeeds } from './feature-needs.value-object.js';

describe('FeatureNeeds', () => {
  describe('constructor', () => {
    it('should create feature needs with empty arrays', () => {
      const featureNeeds = new FeatureNeeds({
        priorityFeatures: [],
        integrationNeeds: [],
      });

      expect(featureNeeds).toBeInstanceOf(FeatureNeeds);
      expect((featureNeeds as any).props.priorityFeatures).toEqual([]);
      expect((featureNeeds as any).props.integrationNeeds).toEqual([]);
    });

    it('should create feature needs with priority features', () => {
      const features = ['AI Screening', 'Resume Parsing', 'Candidate Matching'];
      const featureNeeds = new FeatureNeeds({
        priorityFeatures: features,
        integrationNeeds: [],
      });

      expect((featureNeeds as any).props.priorityFeatures).toEqual(features);
    });

    it('should create feature needs with integration needs', () => {
      const integrations = [
        'LinkedIn',
        'ATS Integration',
        'Email Notifications',
      ];
      const featureNeeds = new FeatureNeeds({
        priorityFeatures: [],
        integrationNeeds: integrations,
      });

      expect((featureNeeds as any).props.integrationNeeds).toEqual(
        integrations,
      );
    });

    it('should create feature needs with both types', () => {
      const features = ['AI Screening', 'Analytics'];
      const integrations = ['LinkedIn', 'Slack'];
      const featureNeeds = new FeatureNeeds({
        priorityFeatures: features,
        integrationNeeds: integrations,
      });

      expect((featureNeeds as any).props.priorityFeatures).toEqual(features);
      expect((featureNeeds as any).props.integrationNeeds).toEqual(
        integrations,
      );
    });

    it('should handle single feature', () => {
      const featureNeeds = new FeatureNeeds({
        priorityFeatures: ['AI Screening'],
        integrationNeeds: ['Email'],
      });

      expect((featureNeeds as any).props.priorityFeatures).toHaveLength(1);
      expect((featureNeeds as any).props.integrationNeeds).toHaveLength(1);
    });

    it('should handle many features', () => {
      const features = Array.from({ length: 20 }, (_, i) => `Feature ${i + 1}`);
      const integrations = Array.from(
        { length: 10 },
        (_, i) => `Integration ${i + 1}`,
      );

      const featureNeeds = new FeatureNeeds({
        priorityFeatures: features,
        integrationNeeds: integrations,
      });

      expect((featureNeeds as any).props.priorityFeatures).toHaveLength(20);
      expect((featureNeeds as any).props.integrationNeeds).toHaveLength(10);
    });

    it('should handle duplicate features', () => {
      const featureNeeds = new FeatureNeeds({
        priorityFeatures: ['AI Screening', 'AI Screening', 'Resume Parsing'],
        integrationNeeds: ['LinkedIn', 'LinkedIn'],
      });

      expect((featureNeeds as any).props.priorityFeatures).toHaveLength(3);
      expect((featureNeeds as any).props.integrationNeeds).toHaveLength(2);
    });
  });

  describe('props access', () => {
    it('should store props correctly', () => {
      const priorityFeatures = ['Feature A', 'Feature B'];
      const integrationNeeds = ['Integration X'];

      const featureNeeds = new FeatureNeeds({
        priorityFeatures,
        integrationNeeds,
      });

      const props = (featureNeeds as any).props;
      expect(props.priorityFeatures).toBe(priorityFeatures);
      expect(props.integrationNeeds).toBe(integrationNeeds);
    });
  });

  describe('edge cases', () => {
    it('should handle feature names with special characters', () => {
      const features = ['AI/ML Features', 'Real-time Sync', 'API v2.0'];
      const integrations = ['ATS&CRM Integration', 'Email + SMS'];

      const featureNeeds = new FeatureNeeds({
        priorityFeatures: features,
        integrationNeeds: integrations,
      });

      expect((featureNeeds as any).props.priorityFeatures).toEqual(features);
      expect((featureNeeds as any).props.integrationNeeds).toEqual(
        integrations,
      );
    });

    it('should handle unicode feature names', () => {
      const features = ['🤖 AI功能', '中文功能'];
      const integrations = ['微信集成', '📧 邮件'];

      const featureNeeds = new FeatureNeeds({
        priorityFeatures: features,
        integrationNeeds: integrations,
      });

      expect((featureNeeds as any).props.priorityFeatures).toEqual(features);
      expect((featureNeeds as any).props.integrationNeeds).toEqual(
        integrations,
      );
    });

    it('should handle long feature names', () => {
      const longFeature = 'A'.repeat(200);
      const featureNeeds = new FeatureNeeds({
        priorityFeatures: [longFeature],
        integrationNeeds: [],
      });

      expect((featureNeeds as any).props.priorityFeatures[0]).toBe(longFeature);
    });
  });
});
