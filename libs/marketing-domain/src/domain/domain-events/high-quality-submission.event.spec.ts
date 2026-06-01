import { HighQualitySubmissionEvent } from './high-quality-submission.event';

describe('HighQualitySubmissionEvent', () => {
  describe('constructor', () => {
    it('should create event with all properties', () => {
      const questionnaireId = 'quest_123';
      const submitterIP = '192.168.1.1';
      const qualityScore = 85;
      const qualityReasons = ['High completion rate', 'Detailed responses'];
      const occurredAt = new Date();

      const event = new HighQualitySubmissionEvent(
        questionnaireId,
        submitterIP,
        qualityScore,
        qualityReasons,
        occurredAt,
      );

      expect(event.questionnaireId).toBe(questionnaireId);
      expect(event.submitterIP).toBe(submitterIP);
      expect(event.qualityScore).toBe(qualityScore);
      expect(event.qualityReasons).toBe(qualityReasons);
      expect(event.occurredAt).toBe(occurredAt);
    });

    it('should have occurredAt as Date', () => {
      const occurredAt = new Date();
      const event = new HighQualitySubmissionEvent(
        'quest_123',
        '192.168.1.1',
        85,
        ['Good quality'],
        occurredAt,
      );

      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should handle empty quality reasons', () => {
      const event = new HighQualitySubmissionEvent(
        'quest_123',
        '192.168.1.1',
        85,
        [],
        new Date(),
      );

      expect(event.qualityReasons).toEqual([]);
    });
  });

  describe('DomainEvent compliance', () => {
    it('should implement DomainEvent interface', () => {
      const event = new HighQualitySubmissionEvent(
        'quest_123',
        '192.168.1.1',
        85,
        ['High completion rate'],
        new Date(),
      );

      expect(event.occurredAt).toBeDefined();
    });

    it('should allow accessing all properties', () => {
      const event = new HighQualitySubmissionEvent(
        'quest_456',
        '10.0.0.1',
        92,
        ['Excellent text quality', 'High satisfaction'],
        new Date(),
      );

      expect(event.questionnaireId).toBe('quest_456');
      expect(event.submitterIP).toBe('10.0.0.1');
      expect(event.qualityScore).toBe(92);
      expect(event.qualityReasons).toHaveLength(2);
    });
  });

  describe('high quality criteria', () => {
    it('should support high quality score', () => {
      const event = new HighQualitySubmissionEvent(
        'quest_123',
        '192.168.1.1',
        95,
        ['Exceptional submission'],
        new Date(),
      );

      expect(event.qualityScore).toBeGreaterThanOrEqual(70);
    });

    it('should store multiple quality reasons', () => {
      const reasons = [
        'High completion rate',
        'Detailed responses',
        'Valuable feedback',
        'Good satisfaction scores',
      ];
      const event = new HighQualitySubmissionEvent(
        'quest_123',
        '192.168.1.1',
        88,
        reasons,
        new Date(),
      );

      expect(event.qualityReasons).toEqual(reasons);
    });
  });
});
