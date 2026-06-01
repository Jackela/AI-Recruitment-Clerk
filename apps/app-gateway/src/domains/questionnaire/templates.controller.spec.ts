import { TemplatesController } from './templates.controller';

describe('TemplatesController', () => {
  let controller: TemplatesController;

  beforeEach(() => {
    controller = new TemplatesController({} as any);
  });

  describe('getTemplates', () => {
    it('should get templates', async () => {
      const result = await controller.getTemplates();

      expect(result).toHaveProperty('items');
    });
  });

  describe('getTemplate', () => {
    it('should get template by id', async () => {
      const result = await controller.getTemplate('t-123');

      expect(result).toHaveProperty('id');
    });
  });
});
