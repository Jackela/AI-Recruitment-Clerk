import type { JetStreamManager } from 'nats';
import type { StreamConfig, StreamInfo, ConsumerInfo, ConsumerConfig } from '../interfaces';
import type { NatsConnectionManager } from './nats-connection-manager.service';
/**
 * NATS Stream Manager Service
 * Handles JetStream stream and consumer management operations
 */
export declare class NatsStreamManager {
    private readonly connectionManager;
    private readonly logger;
    /**
     * Initializes a new instance of the NATS Stream Manager.
     * @param connectionManager - The connection manager.
     */
    constructor(connectionManager: NatsConnectionManager);
    /**
     * Ensure specified streams exist, creating them if necessary
     */
    ensureStreamsExist(streams: StreamConfig[]): Promise<void>;
    /**
     * Ensure a single stream exists
     */
    ensureStreamExists(jsm: JetStreamManager, config: StreamConfig): Promise<void>;
    /**
     * Create or update a consumer for a stream
     */
    ensureConsumerExists(streamName: string, consumerConfig: ConsumerConfig): Promise<void>;
    /**
     * Get information about a specific stream
     */
    getStreamInfo(streamName: string): Promise<StreamInfo | null>;
    /**
     * Get information about a specific consumer
     */
    getConsumerInfo(streamName: string, consumerName: string): Promise<ConsumerInfo | null>;
    /**
     * List all streams
     */
    listStreams(): Promise<StreamInfo[]>;
    /**
     * List consumers for a specific stream
     */
    listConsumers(streamName: string): Promise<ConsumerInfo[]>;
    /**
     * Delete a stream (use with caution)
     */
    deleteStream(streamName: string): Promise<void>;
    /**
     * Delete a consumer (use with caution)
     */
    deleteConsumer(streamName: string, consumerName: string): Promise<void>;
}
