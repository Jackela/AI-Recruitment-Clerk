import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NatsConnectionConfig, StreamConfig, MessageHandler, SubscriptionOptions, NatsPublishResult, NatsHealthResult } from '../interfaces';
import { NatsConnectionManager } from './nats-connection-manager.service';
import { NatsStreamManager } from './nats-stream-manager.service';
/**
 * Base NATS Client Service
 * Provides high-level API for NATS messaging operations
 */
export declare class NatsClientService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly connectionManager;
    private readonly streamManager;
    private readonly logger;
    private readonly activeSubscriptions;
    private serviceName;
    /**
     * Initializes a new instance of the NATS Client Service.
     * @param configService - The config service.
     * @param connectionManager - The connection manager.
     * @param streamManager - The stream manager.
     */
    constructor(configService: ConfigService, connectionManager: NatsConnectionManager, streamManager: NatsStreamManager);
    /**
     * Performs the on module init operation.
     * @returns The result of the operation.
     */
    onModuleInit(): Promise<void>;
    /**
     * Performs the on module destroy operation.
     * @returns The result of the operation.
     */
    onModuleDestroy(): Promise<void>;
    /**
     * Initialize the NATS client with connection and streams
     */
    initialize(customConfig?: Partial<NatsConnectionConfig>, customStreams?: StreamConfig[]): Promise<void>;
    /**
     * Shutdown the NATS client and clean up resources
     */
    shutdown(): Promise<void>;
    /**
     * Publish a message to a NATS subject
     */
    publish(subject: string, payload: unknown, options?: {
        messageId?: string;
        timeout?: number;
        headers?: Record<string, string>;
    }): Promise<NatsPublishResult>;
    /**
     * Subscribe to messages from a NATS subject
     */
    subscribe<T = unknown>(subject: string, handler: MessageHandler<T>, options?: SubscriptionOptions): Promise<void>;
    /**
     * Emit alias for publish (for compatibility)
     */
    emit(subject: string, payload: unknown): Promise<NatsPublishResult>;
    /**
     * Check if NATS is connected
     */
    get isConnected(): boolean;
    /**
     * Get comprehensive health status
     */
    getHealthStatus(): Promise<NatsHealthResult>;
    /**
     * Get service name
     */
    getServiceName(): string;
    /**
     * Process incoming messages from a subscription
     */
    private processMessages;
}
