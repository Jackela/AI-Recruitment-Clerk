import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { 
  connect, 
  NatsConnection, 
  JetStreamClient, 
  StringCodec,
  ConnectionOptions 
} from 'nats';
import { NatsConnectionConfig, NatsHealthResult } from '../interfaces';

/**
 * NATS Connection Manager Service
 * Handles low-level NATS connection management, reconnection logic, and health monitoring
 */
@Injectable()
export class NatsConnectionManager implements OnModuleDestroy {
  private readonly logger = new Logger(NatsConnectionManager.name);
  private connection: NatsConnection | null = null;
  private jetstream: JetStreamClient | null = null;
  private readonly codec = StringCodec();
  private connectionStartTime: number | null = null;
  private reconnectAttempts = 0;


  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Establish connection to NATS server with JetStream enabled
   */
  async connect(config: NatsConnectionConfig): Promise<void> {
    try {
      if (this.isConnected) {
        this.logger.log('Already connected to NATS');
        return;
      }

      this.logger.log('Connecting to NATS JetStream...');
      this.logger.log(`Server(s): ${Array.isArray(config.url) ? config.url.join(', ') : config.url}`);
      this.logger.log(`Service: ${config.serviceName}`);

      const connectionOptions: ConnectionOptions = {
        servers: config.url,
        name: config.serviceName,
        timeout: config.timeout || 10000,
        maxReconnectAttempts: config.maxReconnectAttempts || 10,
        reconnectTimeWait: config.reconnectTimeWait || 2000,
      };

      this.connection = await connect(connectionOptions);
      this.jetstream = this.connection.jetstream();
      this.connectionStartTime = Date.now();
      this.reconnectAttempts = 0;

      // Setup connection event handlers
      await this.setupConnectionHandlers();

      this.logger.log('✅ Successfully connected to NATS JetStream');
    } catch (error) {
      this.logger.error('❌ Failed to connect to NATS JetStream', error);
      
      // If connection is optional (development mode), don't throw
      if (config.optional) {
        this.logger.warn('⚠️ NATS connection failed but marked as optional - continuing without NATS');
        return;
      }
      
      throw error;
    }
  }

  /**
   * Disconnect from NATS server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.connection && !this.connection.isClosed()) {
        this.logger.log('Disconnecting from NATS...');
        await this.connection.close();
        this.connection = null;
        this.jetstream = null;
        this.connectionStartTime = null;
        this.logger.log('✅ Disconnected from NATS');
      }
    } catch (error) {
      this.logger.error('❌ Error during NATS disconnect', error);
    }
  }

  /**
   * Get NATS connection instance
   */
  getConnection(): NatsConnection | null {
    return this.connection;
  }

  /**
   * Get JetStream client instance
   */
  getJetStream(): JetStreamClient | null {
    return this.jetstream;
  }

  /**
   * Get string codec for message encoding/decoding
   */
  getCodec(): ReturnType<typeof StringCodec> {
    return this.codec;
  }

  /**
   * Check if connected to NATS
   */
  get isConnected(): boolean {
    return this.connection !== null && !this.connection.isClosed();
  }

  /**
   * Get connection health status
   */
  async getHealthStatus(): Promise<NatsHealthResult> {
    const connected = this.isConnected;
    const jetstreamAvailable = this.jetstream !== null;
    
    let subscriptionCount = 0;
    let currentServer: string | undefined;
    
    try {
      if (this.connection) {
        const status = this.connection.getServer();
        currentServer = status;
        
        // Get subscription count (approximation)
        const stats = this.connection.stats();
        subscriptionCount = stats.inMsgs > 0 ? 1 : 0; // Simplified count
      }
    } catch (error) {
      this.logger.warn('Could not get detailed connection stats', error);
    }

    const uptimeMs = this.connectionStartTime 
      ? Date.now() - this.connectionStartTime 
      : 0;

    return {
      healthy: connected && jetstreamAvailable,
      connected,
      jetstreamAvailable,
      subscriptionCount,
      lastOperationTime: new Date(),
      metadata: {
        currentServer,
        reconnectAttempts: this.reconnectAttempts,
        uptimeMs,
      },
    };
  }

  /**
   * Generate unique message ID
   */
  generateMessageId(prefix = 'msg'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup connection event handlers for monitoring and logging
   */
  private async setupConnectionHandlers(): Promise<void> {
    if (!this.connection) return;

    // Handle connection closure
    this.connection.closed().then((err) => {
      if (err) {
        this.logger.error('🔴 NATS connection closed with error', err);
      } else {
        this.logger.log('🔴 NATS connection closed');
      }
      this.connectionStartTime = null;
    });

    // Monitor connection status changes
    this.handleConnectionStatus();
  }

  /**
   * Handle connection status monitoring
   */
  private async handleConnectionStatus(): Promise<void> {
    if (!this.connection) return;

    try {
      for await (const status of this.connection.status()) {
        switch (status.type) {
          case 'disconnect':
            this.logger.warn(`🟡 NATS disconnected from server: ${status.data}`);
            break;
          case 'reconnecting':
            this.reconnectAttempts++;
            this.logger.log(`🔄 NATS reconnecting to server: ${status.data} (attempt ${this.reconnectAttempts})`);
            break;
          case 'reconnect':
            this.logger.log(`🟢 NATS reconnected to server: ${status.data}`);
            break;
          case 'error':
            this.logger.error(`🔴 NATS connection error: ${status.data}`);
            break;
          case 'pingTimer':
            // Suppress frequent ping timer messages
            break;
          default:
            this.logger.log(`ℹ️ NATS status: ${status.type} - ${status.data}`);
        }
      }
    } catch (error) {
      this.logger.error('Error monitoring NATS connection status', error);
    }
  }
}