import { Injectable, Logger } from '@nestjs/common';
import type {
  JetStreamManager,
  StreamInfo as NatsStreamInfo,
  ConsumerInfo as NatsConsumerInfo,
} from 'nats';
import type {
  StreamConfig,
  StreamInfo,
  ConsumerInfo,
  ConsumerConfig,
} from '../interfaces';
import type { NatsConnectionManager } from './nats-connection-manager.service';

/**
 * NATS Stream Manager Service
 * Handles JetStream stream and consumer management operations
 */
@Injectable()
export class NatsStreamManager {
  private readonly logger = new Logger(NatsStreamManager.name);

  /**
   * Initializes a new instance of the NATS Stream Manager.
   * @param connectionManager - The connection manager.
   */
  constructor(private readonly connectionManager: NatsConnectionManager) {}

  /**
   * Ensure specified streams exist, creating them if necessary
   */
  public async ensureStreamsExist(streams: StreamConfig[]): Promise<void> {
    const connection = this.connectionManager.getConnection();
    if (!connection) {
      throw new Error('NATS connection not available');
    }

    try {
      const jsm = await connection.jetstreamManager();

      for (const streamConfig of streams) {
        await this.ensureStreamExists(jsm, streamConfig);
      }

      this.logger.log(
        `✅ All ${streams.length} streams validated/created successfully`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to ensure streams exist', error);
      throw error;
    }
  }

  /**
   * Ensure a single stream exists
   */
  public async ensureStreamExists(
    jsm: JetStreamManager,
    config: StreamConfig,
  ): Promise<void> {
    try {
      // Check if stream already exists
      await jsm.streams.info(config.name);
      this.logger.log(`✅ Stream '${config.name}' already exists`);
    } catch {
      // Stream doesn't exist, create it
      try {
        await jsm.streams.add({
          name: config.name,
          subjects: config.subjects,
          retention: config.retention,
          max_age: config.maxAge,
          max_msgs: config.maxMsgs,
          discard: config.discard,
          duplicate_window: config.duplicateWindow,
        });

        this.logger.log(
          `✅ Created stream '${config.name}' with subjects: ${config.subjects.join(', ')}`,
        );
      } catch (createError) {
        this.logger.error(
          `❌ Failed to create stream '${config.name}'`,
          createError,
        );
        throw createError;
      }
    }
  }

  /**
   * Create or update a consumer for a stream
   */
  public async ensureConsumerExists(
    streamName: string,
    consumerConfig: ConsumerConfig,
  ): Promise<void> {
    const connection = this.connectionManager.getConnection();
    if (!connection) {
      throw new Error('NATS connection not available');
    }

    try {
      const jsm = await connection.jetstreamManager();

      // Try to create the consumer
      try {
        await jsm.consumers.add(streamName, {
          durable_name: consumerConfig.durableName,
          filter_subject: consumerConfig.filterSubject,
          deliver_policy: consumerConfig.deliverPolicy,
          ack_policy: consumerConfig.ackPolicy,
          max_deliver: consumerConfig.maxDeliver,
          ack_wait: consumerConfig.ackWait,
        });

        this.logger.log(
          `✅ Created consumer '${consumerConfig.durableName}' for stream '${streamName}' with subject '${consumerConfig.filterSubject}'`,
        );
      } catch (error) {
        // Consumer might already exist, that's usually fine
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes('already exists') ||
          errorMessage.includes('consumer name already in use')
        ) {
          this.logger.log(
            `ℹ️ Consumer '${consumerConfig.durableName}' already exists for stream '${streamName}'`,
          );
        } else {
          this.logger.warn(
            `⚠️ Could not create/update consumer '${consumerConfig.durableName}': ${errorMessage}`,
          );
          throw error;
        }
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to ensure consumer '${consumerConfig.durableName}' exists`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get information about a specific stream
   */
  public async getStreamInfo(streamName: string): Promise<StreamInfo | null> {
    const connection = this.connectionManager.getConnection();
    if (!connection) {
      return null;
    }

    try {
      const jsm = await connection.jetstreamManager();
      const info: NatsStreamInfo = await jsm.streams.info(streamName);

      return {
        name: info.config.name,
        subjects: info.config.subjects || [],
        messageCount: info.state.messages,
        consumerCount: info.state.consumer_count || 0,
        created: new Date(info.created),
        lastMessage: info.state.last_ts
          ? new Date(info.state.last_ts)
          : undefined,
      };
    } catch (error) {
      this.logger.warn(`Could not get stream info for '${streamName}'`, error);
      return null;
    }
  }

  /**
   * Get information about a specific consumer
   */
  public async getConsumerInfo(
    streamName: string,
    consumerName: string,
  ): Promise<ConsumerInfo | null> {
    const connection = this.connectionManager.getConnection();
    if (!connection) {
      return null;
    }

    try {
      const jsm = await connection.jetstreamManager();
      const info: NatsConsumerInfo = await jsm.consumers.info(
        streamName,
        consumerName,
      );

      return {
        name: info.name,
        streamName: info.stream_name,
        subject: info.config.filter_subject || '',
        delivered: info.delivered.stream_seq,
        acknowledged: info.ack_floor.stream_seq,
        pending: info.num_pending,
        created: new Date(info.created),
        lastActivity: info.ts ? new Date(info.ts) : undefined,
      };
    } catch (error) {
      this.logger.warn(
        `Could not get consumer info for '${consumerName}' in stream '${streamName}'`,
        error,
      );
      return null;
    }
  }

  /**
   * List all streams
   */
  public async listStreams(): Promise<StreamInfo[]> {
    const connection = this.connectionManager.getConnection();
    if (!connection) {
      return [];
    }

    try {
      const jsm = await connection.jetstreamManager();
      const streams: StreamInfo[] = [];

      for await (const streamInfo of jsm.streams.list()) {
        streams.push({
          name: streamInfo.config.name,
          subjects: streamInfo.config.subjects || [],
          messageCount: streamInfo.state.messages,
          consumerCount: streamInfo.state.consumer_count || 0,
          created: new Date(streamInfo.created),
          lastMessage: streamInfo.state.last_ts
            ? new Date(streamInfo.state.last_ts)
            : undefined,
        });
      }

      return streams;
    } catch (error) {
      this.logger.error('Could not list streams', error);
      return [];
    }
  }

  /**
   * List consumers for a specific stream
   */
  public async listConsumers(streamName: string): Promise<ConsumerInfo[]> {
    const connection = this.connectionManager.getConnection();
    if (!connection) {
      return [];
    }

    try {
      const jsm = await connection.jetstreamManager();
      const consumers: ConsumerInfo[] = [];

      for await (const consumerInfo of jsm.consumers.list(streamName)) {
        consumers.push({
          name: consumerInfo.name,
          streamName: consumerInfo.stream_name,
          subject: consumerInfo.config.filter_subject || '',
          delivered: consumerInfo.delivered.stream_seq,
          acknowledged: consumerInfo.ack_floor.stream_seq,
          pending: consumerInfo.num_pending,
          created: new Date(consumerInfo.created),
          lastActivity: consumerInfo.ts ? new Date(consumerInfo.ts) : undefined,
        });
      }

      return consumers;
    } catch (error) {
      this.logger.error(
        `Could not list consumers for stream '${streamName}'`,
        error,
      );
      return [];
    }
  }

  /**
   * Delete a stream (use with caution)
   */
  public async deleteStream(streamName: string): Promise<void> {
    const connection = this.connectionManager.getConnection();
    if (!connection) {
      throw new Error('NATS connection not available');
    }

    try {
      const jsm = await connection.jetstreamManager();
      await jsm.streams.delete(streamName);

      this.logger.log(`🗑️ Deleted stream '${streamName}'`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete stream '${streamName}'`, error);
      throw error;
    }
  }

  /**
   * Delete a consumer (use with caution)
   */
  public async deleteConsumer(
    streamName: string,
    consumerName: string,
  ): Promise<void> {
    const connection = this.connectionManager.getConnection();
    if (!connection) {
      throw new Error('NATS connection not available');
    }

    try {
      const jsm = await connection.jetstreamManager();
      await jsm.consumers.delete(streamName, consumerName);

      this.logger.log(
        `🗑️ Deleted consumer '${consumerName}' from stream '${streamName}'`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to delete consumer '${consumerName}' from stream '${streamName}'`,
        error,
      );
      throw error;
    }
  }
}
