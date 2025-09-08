import { Module, DynamicModule, Global } from '@nestjs/common';
import { NatsConnectionManager, NatsStreamManager } from '@app/shared-nats-client';
import { connect, NatsConnection, JetStreamManager } from 'nats';

/**
 * Test NATS Module for Integration Testing
 * Provides either mock NATS or real NATS connection
 */
@Global()
@Module({})
export class TestNatsModule {
  private static natsConnection: NatsConnection;

  static async forRoot(useDocker = false): Promise<DynamicModule> {
    let connectionManager: any;
    let streamManager: any;

    if (useDocker) {
      // Use real NATS connection for integration tests
      const natsUrl = process.env.NATS_SERVERS || 'nats://testuser:testpass@localhost:4223';
      
      try {
        this.natsConnection = await connect({
          servers: natsUrl,
          maxReconnectAttempts: 3,
          reconnectTimeWait: 1000,
        });

        const jsm = await this.natsConnection.jetstreamManager();
        
        // Create test stream if it doesn't exist
        try {
          await jsm.streams.add({
            name: 'RESUME_PARSER_TEST',
            subjects: ['resume.*', 'job.*', 'report.*'],
            retention: 'limits',
            max_msgs: 10000,
            max_age: 24 * 60 * 60 * 1000000000, // 24 hours in nanoseconds
          });
        } catch (err: any) {
          if (!err.message?.includes('stream name already in use')) {
            console.error('Failed to create test stream:', err);
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
        console.error('Failed to connect to NATS:', error);
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

  static async closeConnection(): Promise<void> {
    if (this.natsConnection) {
      await this.natsConnection.drain();
      await this.natsConnection.close();
      this.natsConnection = undefined as any;
    }
  }
}