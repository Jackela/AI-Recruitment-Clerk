/**
 * BaseMicroserviceService Tests
 * Tests for the base microservice NATS service
 */

import { Logger } from '@nestjs/common';
import { BaseMicroserviceService } from './base-microservice.service';

jest.mock('@ai-recruitment-clerk/shared-nats-client', () => ({
  NatsClientService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    publish: jest
      .fn()
      .mockResolvedValue({ success: true, messageId: 'test-id' }),
    subscribe: jest.fn().mockResolvedValue(undefined),
    getHealthStatus: jest.fn().mockResolvedValue({
      connected: true,
      lastOperationTime: new Date(),
      messagesSent: 10,
      messagesReceived: 5,
    }),
    isConnected: true,
  })),
  NatsConnectionManager: jest.fn(),
  NatsStreamManager: jest.fn(),
}));

describe('BaseMicroserviceService', () => {
  let service: any;

  beforeEach(() => {
    class TestMicroserviceService extends BaseMicroserviceService {
      constructor() {
        const mockConfig = {
          get: jest.fn().mockReturnValue('test-service'),
        } as any;
        const mockConn = {} as any;
        const mockStream = {} as any;
        super(mockConfig, mockConn, mockStream, 'test-microservice');
      }
    }
    service = new TestMicroserviceService();
  });

  it('should create instance with correct microserviceName', () => {
    expect(service.microserviceName).toBe('test-microservice');
  });

  it('should create Logger instance', () => {
    expect(service.serviceLogger).toBeInstanceOf(Logger);
  });
});
