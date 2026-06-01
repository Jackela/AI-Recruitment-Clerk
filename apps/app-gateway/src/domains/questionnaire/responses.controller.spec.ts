import { ResponsesController } from './responses.controller';

describe('ResponsesController', () => {
  let controller: ResponsesController;

  beforeEach(() => {
    controller = new ResponsesController({} as any);
  });

  describe('submitResponse', () => {
    it('should submit response', async () => {
      const result = await controller.submitResponse('q-123', {} as any);

      expect(result).toHaveProperty('responseId');
    });
  });

  describe('getResponses', () => {
    it('should get responses', async () => {
      const result = await controller.getResponses('q-123');

      expect(result).toHaveProperty('items');
    });
  });
});
