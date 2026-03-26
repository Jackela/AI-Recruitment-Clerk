import { WebSocketDemoController } from './websocket-demo.controller';

describe('WebSocketDemoController', () => {
  let controller: WebSocketDemoController;

  beforeEach(() => {
    controller = new WebSocketDemoController({} as any);
  });

  describe('getDemoStatus', () => {
    it('should return demo status', () => {
      const result = controller.getDemoStatus();

      expect(result).toHaveProperty('available');
    });
  });
});
