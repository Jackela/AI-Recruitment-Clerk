import { WebSocketDemoController } from './websocket-demo.controller';

describe('WebSocketDemoController', () => {
  let controller: WebSocketDemoController;

  beforeEach(() => {
    const mockWebSocketGateway = {
      sendStepChange: jest.fn(),
      sendProgressUpdate: jest.fn(),
      sendCompletion: jest.fn(),
      sendError: jest.fn(),
    };
    controller = new WebSocketDemoController(mockWebSocketGateway as any);
  });

  describe('getDemoStatus', () => {
    it('should return demo status', () => {
      const result = controller.getDemoStatus();

      expect(result).toHaveProperty('available');
      expect(result.available).toBe(true);
    });
  });
});
