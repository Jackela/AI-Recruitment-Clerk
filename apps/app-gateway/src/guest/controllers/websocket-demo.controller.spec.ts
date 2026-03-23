import { WebsocketDemoController } from './websocket-demo.controller';

describe('WebsocketDemoController', () => {
  let controller: WebsocketDemoController;

  beforeEach(() => {
    controller = new WebsocketDemoController({} as any);
  });

  describe('getDemoStatus', () => {
    it('should return demo status', () => {
      const result = controller.getDemoStatus();

      expect(result).toHaveProperty('available');
    });
  });
});
