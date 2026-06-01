import { QuestionnairesController } from './questionnaires.controller';
import { QuestionnairesService } from './questionnaires.service';

describe('QuestionnairesController', () => {
  let controller: QuestionnairesController;
  let service: QuestionnairesService;

  beforeEach(() => {
    service = new QuestionnairesService();
    controller = new QuestionnairesController(service);
  });

  describe('create', () => {
    it('should create a questionnaire', () => {
      const result = controller.create({});

      expect(result.questionnaireId).toMatch(/^q-/);
    });
  });

  describe('createSingular', () => {
    it('should create a questionnaire (singular endpoint)', () => {
      const result = controller.createSingular({});

      expect(result.questionnaireId).toMatch(/^q-/);
    });
  });

  describe('publish', () => {
    it('should publish an existing questionnaire', () => {
      const { questionnaireId } = service.createQuestionnaire();

      const result = controller.publish(questionnaireId);

      expect(result.accessUrl).toBe(`/q/${questionnaireId}`);
      expect(result.publicId).toMatch(/^pub-/);
    });
  });

  describe('publishSingular', () => {
    it('should publish and delegate to publish', () => {
      const { questionnaireId } = service.createQuestionnaire();

      const result = controller.publishSingular(questionnaireId);

      expect(result.accessUrl).toBe(`/q/${questionnaireId}`);
    });
  });

  describe('submitSingular', () => {
    it('should submit to published questionnaire', () => {
      const { questionnaireId } = service.createQuestionnaire();
      service.publishQuestionnaire(questionnaireId);

      const result = controller.submitSingular(questionnaireId, {});

      expect(result.submissionId).toMatch(/^sub-/);
      expect(result.qualityScore).toBe(80);
    });
  });

  describe('submitPlural', () => {
    it('should submit to published questionnaire (plural)', () => {
      const { questionnaireId } = service.createQuestionnaire();
      service.publishQuestionnaire(questionnaireId);

      const result = controller.submitPlural(questionnaireId, {});

      expect(result.submissionId).toMatch(/^sub-/);
    });
  });

  describe('analytics', () => {
    it('should return analytics for questionnaire', () => {
      const { questionnaireId } = service.createQuestionnaire();
      service.publishQuestionnaire(questionnaireId);
      service.submitQuestionnaire(questionnaireId);

      const result = controller.analytics(questionnaireId);

      expect(result.totalSubmissions).toBe(1);
      expect(result.averageQualityScore).toBe(80);
    });
  });

  describe('exportData', () => {
    it('should return export URL and expiration', () => {
      const result = controller.exportData();

      expect(result.exportUrl).toMatch(/^\/exports\//);
      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('list', () => {
    it('should return list of questionnaires', () => {
      service.createQuestionnaire();
      service.createQuestionnaire();

      const result = controller.list();

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });
});
