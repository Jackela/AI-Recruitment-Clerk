import { QuestionnaireController as DomainQuestionnaireController } from './questionnaire.controller';

describe('DomainQuestionnaireController', () => {
  let controller: DomainQuestionnaireController;

  beforeEach(() => {
    controller = new DomainQuestionnaireController({} as any);
  });

  describe('create', () => {
    it('should create questionnaire', async () => {
      const result = await controller.create({} as any);

      expect(result).toHaveProperty('id');
    });
  });

  describe('get', () => {
    it('should get questionnaire', async () => {
      const result = await controller.get('q-123');

      expect(result).toHaveProperty('id');
    });
  });
});
