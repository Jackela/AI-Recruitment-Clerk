import { QuestionnaireIntegrationService } from './questionnaire-integration.service';

describe('QuestionnaireIntegrationService', () => {
  let service: QuestionnaireIntegrationService;

  beforeEach(() => {
    service = new QuestionnaireIntegrationService({} as any);
  });

  describe('syncQuestionnaire', () => {
    it('should sync questionnaire', async () => {
      const result = await service.syncQuestionnaire('q-123');

      expect(result).toHaveProperty('synced');
    });
  });

  describe('getQuestionnaireStatus', () => {
    it('should get status', async () => {
      const result = await service.getQuestionnaireStatus('q-123');

      expect(result).toHaveProperty('status');
    });
  });
});
