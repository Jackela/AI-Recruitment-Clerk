import {
  QuestionnairesService,
  QuestionnaireNotFoundError,
  QuestionnaireNotPublishedError,
} from './questionnaires.service';

describe('QuestionnairesService', () => {
  let service: QuestionnairesService;

  beforeEach(() => {
    service = new QuestionnairesService();
  });

  describe('createQuestionnaire', () => {
    it('should create a new questionnaire with unpublished status', () => {
      const result = service.createQuestionnaire();

      expect(result.questionnaireId).toMatch(/^q-[a-f0-9]{12}$/);
    });

    it('should allow creating multiple questionnaires', () => {
      const q1 = service.createQuestionnaire();
      const q2 = service.createQuestionnaire();

      expect(q1.questionnaireId).not.toBe(q2.questionnaireId);
    });
  });

  describe('publishQuestionnaire', () => {
    it('should publish an unpublished questionnaire', () => {
      const { questionnaireId } = service.createQuestionnaire();

      const result = service.publishQuestionnaire(questionnaireId);

      expect(result.accessUrl).toBe(`/q/${questionnaireId}`);
      expect(result.publicId).toMatch(/^pub-[a-f0-9]{12}$/);
    });

    it('should throw QuestionnaireNotFoundError for non-existent questionnaire', () => {
      expect(() => service.publishQuestionnaire('non-existent')).toThrow(
        QuestionnaireNotFoundError,
      );
    });
  });

  describe('submitQuestionnaire', () => {
    it('should submit to published questionnaire', () => {
      const { questionnaireId } = service.createQuestionnaire();
      service.publishQuestionnaire(questionnaireId);

      const result = service.submitQuestionnaire(questionnaireId);

      expect(result.submissionId).toMatch(/^sub-[a-f0-9]{12}$/);
      expect(result.qualityScore).toBe(80);
    });

    it('should throw QuestionnaireNotFoundError for non-existent questionnaire', () => {
      expect(() => service.submitQuestionnaire('non-existent')).toThrow(
        QuestionnaireNotFoundError,
      );
    });

    it('should throw QuestionnaireNotPublishedError for unpublished questionnaire', () => {
      const { questionnaireId } = service.createQuestionnaire();

      expect(() => service.submitQuestionnaire(questionnaireId)).toThrow(
        QuestionnaireNotPublishedError,
      );
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics for questionnaire with submissions', () => {
      const { questionnaireId } = service.createQuestionnaire();
      service.publishQuestionnaire(questionnaireId);
      service.submitQuestionnaire(questionnaireId);
      service.submitQuestionnaire(questionnaireId);

      const result = service.getAnalytics(questionnaireId);

      expect(result.totalSubmissions).toBe(2);
      expect(result.averageQualityScore).toBe(80);
      expect(result.completionRate).toBe(100);
    });

    it('should return default analytics for questionnaire with no submissions', () => {
      const { questionnaireId } = service.createQuestionnaire();
      service.publishQuestionnaire(questionnaireId);

      const result = service.getAnalytics(questionnaireId);

      expect(result.totalSubmissions).toBe(0);
      expect(result.averageQualityScore).toBe(75);
    });

    it('should throw QuestionnaireNotFoundError for non-existent questionnaire', () => {
      expect(() => service.getAnalytics('non-existent')).toThrow(
        QuestionnaireNotFoundError,
      );
    });
  });

  describe('exportQuestionnaireData', () => {
    it('should return export URL and expiration', () => {
      const result = service.exportQuestionnaireData();

      expect(result.exportUrl).toMatch(/^\/exports\/report-[a-f0-9]+\.json$/);
      expect(result.expiresAt).toBeDefined();
      expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('listQuestionnaires', () => {
    it('should return empty list initially', () => {
      const result = service.listQuestionnaires();

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should list created questionnaires', () => {
      const q1 = service.createQuestionnaire();
      const q2 = service.createQuestionnaire();

      const result = service.listQuestionnaires();

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items.map((i) => i.questionnaireId)).toContain(
        q1.questionnaireId,
      );
      expect(result.items.map((i) => i.questionnaireId)).toContain(
        q2.questionnaireId,
      );
    });

    it('should track submissions count', () => {
      const { questionnaireId } = service.createQuestionnaire();
      service.publishQuestionnaire(questionnaireId);
      service.submitQuestionnaire(questionnaireId);
      service.submitQuestionnaire(questionnaireId);

      const result = service.listQuestionnaires();

      const item = result.items.find(
        (i) => i.questionnaireId === questionnaireId,
      );
      expect(item?.submissions).toBe(2);
    });
  });
});
