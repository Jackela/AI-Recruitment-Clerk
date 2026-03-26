import type { TestingModule } from '@nestjs/testing';
import type {
  NatsPublishResult,
  NatsHealthStatus,
} from '@ai-recruitment-clerk/shared-nats-client';

/**
 * 创建标准的 NATS Mock 服务
 * 用于所有E2E测试
 */
export const createMockAppGatewayNatsService = () => ({
  // Publish methods
  publishJobJdSubmitted: jest.fn().mockResolvedValue({
    success: true,
    messageId: `test-job-${Date.now()}`,
  } as NatsPublishResult),

  publishResumeSubmitted: jest.fn().mockResolvedValue({
    success: true,
    messageId: `test-resume-${Date.now()}`,
  } as NatsPublishResult),

  // Subscription methods
  subscribeToAnalysisCompleted: jest.fn().mockResolvedValue(undefined),
  subscribeToAnalysisFailed: jest.fn().mockResolvedValue(undefined),

  // Wait methods
  waitForAnalysisParsed: jest.fn().mockResolvedValue({
    jobId: 'test-job-id',
    resumeId: 'test-resume-id',
    resumeDto: {
      id: 'test-resume-id',
      parsedData: {},
    },
  }),

  waitForEvent: jest.fn().mockResolvedValue({}),

  // General publish
  publish: jest.fn().mockResolvedValue({
    success: true,
    messageId: `test-msg-${Date.now()}`,
  } as NatsPublishResult),

  // Health and status
  getHealthStatus: jest.fn().mockResolvedValue({
    connected: true,
    lastOperationTime: new Date(),
    messagesSent: 0,
    messagesReceived: 0,
  } as NatsHealthStatus),

  isConnected: true,
});

/**
 * Mock NatsClientService
 * 基础的NATS客户端服务mock
 */
export const createMockNatsClientService = () => ({
  publish: jest.fn().mockResolvedValue({
    success: true,
    messageId: `test-msg-${Date.now()}`,
  } as NatsPublishResult),

  subscribe: jest.fn().mockResolvedValue(undefined),

  unsubscribe: jest.fn().mockResolvedValue(undefined),

  isConnected: true,

  getHealthStatus: jest.fn().mockResolvedValue({
    connected: true,
    lastOperationTime: new Date(),
    messagesSent: 0,
    messagesReceived: 0,
  } as NatsHealthStatus),

  close: jest.fn().mockResolvedValue(undefined),
});

/**
 * 标准的测试模块配置（带NATS Mock）
 * 用于快速配置测试模块以覆盖NATS依赖
 */
export const createTestModuleWithMockNats = async <T = TestingModule>(
  Test: typeof import('@nestjs/testing').Test,
  imports: unknown[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overrides?: { provider: any; value: unknown }[],
): Promise<T> => {
  const mockNatsService = createMockAppGatewayNatsService();
  const mockNatsClientService = createMockNatsClientService();

  let builder = Test.createTestingModule({
    imports: imports as any[],
  })
    .overrideProvider('AppGatewayNatsService')
    .useValue(mockNatsService)
    .overrideProvider('NatsClientService')
    .useValue(mockNatsClientService);

  // Apply additional overrides if provided
  if (overrides) {
    for (const override of overrides) {
      builder = builder
        .overrideProvider(override.provider)
        .useValue(override.value);
    }
  }

  return (await builder.compile()) as T;
};

/**
 * 标准的测试模块配置（简化版）
 * 适用于大多数E2E测试场景
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const overrideNatsProviders = (builder: any): any => {
  const mockNatsService = createMockAppGatewayNatsService();
  const mockNatsClientService = createMockNatsClientService();

  return builder
    .overrideProvider('AppGatewayNatsService')
    .useValue(mockNatsService)
    .overrideProvider('NatsClientService')
    .useValue(mockNatsClientService);
};

/**
 * Type for the mock NATS service
 */
export type MockAppGatewayNatsService = ReturnType<
  typeof createMockAppGatewayNatsService
>;
export type MockNatsClientService = ReturnType<
  typeof createMockNatsClientService
>;
