import { QuestionnaireController } from './questionnaire.controller';

describe('QuestionnaireController', () => {
  let controller: QuestionnaireController;

  beforeEach(() => {
    controller = new QuestionnaireController({} as any);
  });

  describe('getQuestionnaire', () => {
    it('should get questionnaire by id', async () => {
      const result = await controller.getQuestionnaire('q-123');

      expect(result).toHaveProperty('id');
    });
  });

  describe('listQuestionnaires', () => {
    it('should list questionnaires', async () => {
      const result = await controller.listQuestionnaires({} as any);

      expect(result).toHaveProperty('items');
    });
  });
});
