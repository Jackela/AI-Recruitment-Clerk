import { Module, DynamicModule, Global, Logger } from '@nestjs/common';
import {
  NatsConnectionManager,
  NatsStreamManager,
  StreamConfigFactory,
} from '@app/shared-nats-client';
import { connect, NatsConnection, JetStreamManager } from 'nats';

/**
 * Test NATS Module for Integration Testing
 * Provides either mock NATS or real NATS connection
 */
@Global()
@Module({})
export class TestNatsModule {
  private static readonly logger = new Logger(TestNatsModule.name);
  private static natsConnection: NatsConnection;

  /**
   * Performs the for root operation.
   * @param useDocker - The use docker.
   * @returns A promise that resolves to DynamicModule.
   */
  static async forRoot(useDocker = false): Promise<DynamicModule> {
    let connectionManager: any;
    let streamManager: any;

    if (useDocker) {
      // Use real NATS connection for integration tests
      const natsUrl =
        process.env.NATS_SERVERS || 'nats://testuser:testpass@localhost:4223';

      try {
        this.natsConnection = await connect({
          servers: natsUrl,
          maxReconnectAttempts: 3,
          reconnectTimeWait: 1000,
        });

        const jsm = await this.natsConnection.jetstreamManager();

        // Create test stream using shared configuration factory
        try {
          const testStreamConfig = StreamConfigFactory.createDev(
            'RESUME_PARSER_TEST',
            ['resume.*', 'job.*', 'report.*'],
          );
          await jsm.streams.add({
            name: testStreamConfig.name,
            subjects: testStreamConfig.subjects,
            retention: testStreamConfig.retention,
            max_msgs: testStreamConfig.maxMsgs,
            max_age: testStreamConfig.maxAge,
            discard: testStreamConfig.discard,
            duplicate_window: testStreamConfig.duplicateWindow,
          });
        } catch (err: any) {
          if (!err.message?.includes('stream name already in use')) {
            this.logger.error(
              'Failed to create test stream',
              err.stack || err.message,
            );
          }
        }

        connectionManager = {
          getConnection: jest.fn().mockResolvedValue(this.natsConnection),
          connect: jest.fn().mockResolvedValue(undefined),
          disconnect: jest.fn().mockResolvedValue(undefined),
          isConnected: jest.fn().mockReturnValue(true),
        };

        streamManager = {
          ensureStream: jest.fn().mockResolvedValue(undefined),
          createConsumer: jest.fn().mockResolvedValue(undefined),
          getStreamInfo: jest.fn().mockResolvedValue({}),
          deleteStream: jest.fn().mockResolvedValue(undefined),
        };
      } catch (error) {
        this.logger.error(
          'Failed to connect to NATS',
          error.stack || error.message,
        );
        // Fall back to mocks if connection fails
        return this.getMockProviders();
      }
    } else {
      // Use mock NATS for unit tests
      return this.getMockProviders();
    }

    return {
      module: TestNatsModule,
      providers: [
        {
          provide: NatsConnectionManager,
          useValue: connectionManager,
        },
        {
          provide: NatsStreamManager,
          useValue: streamManager,
        },
      ],
      exports: [NatsConnectionManager, NatsStreamManager],
    };
  }

  private static getMockProviders(): DynamicModule {
    const mockConnectionManager = {
      getConnection: jest.fn().mockResolvedValue({
        jetstream: jest.fn().mockReturnValue({
          publish: jest.fn().mockResolvedValue({ success: true }),
          subscribe: jest.fn().mockResolvedValue({}),
        }),
        close: jest.fn(),
      }),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(false),
    };

    const mockStreamManager = {
      ensureStream: jest.fn().mockResolvedValue(undefined),
      createConsumer: jest.fn().mockResolvedValue(undefined),
      getStreamInfo: jest.fn().mockResolvedValue(null),
      deleteStream: jest.fn().mockResolvedValue(undefined),
    };

    return {
      module: TestNatsModule,
      providers: [
        {
          provide: NatsConnectionManager,
          useValue: mockConnectionManager,
        },
        {
          provide: NatsStreamManager,
          useValue: mockStreamManager,
        },
      ],
      exports: [NatsConnectionManager, NatsStreamManager],
    };
  }

  /**
   * Performs the close connection operation.
   * @returns A promise that resolves when the operation completes.
   */
  static async closeConnection(): Promise<void> {
    if (this.natsConnection) {
      await this.natsConnection.drain();
      await this.natsConnection.close();
      this.natsConnection = undefined as any;
    }
  }
}
