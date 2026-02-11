import type { OnModuleDestroy } from '@nestjs/common';
import type { NatsConnection, JetStreamClient } from 'nats';
import { StringCodec } from 'nats';
import type { NatsConnectionConfig, NatsHealthResult } from '../interfaces';
/**
 * NATS Connection Manager Service
 * Handles low-level NATS connection management, reconnection logic, and health monitoring
 */
export declare class NatsConnectionManager implements OnModuleDestroy {
    private readonly logger;
    private connection;
    private jetstream;
    private readonly codec;
    private connectionStartTime;
    private reconnectAttempts;
    /**
     * Performs the on module destroy operation.
     * @returns The result of the operation.
     */
    onModuleDestroy(): Promise<void>;
    /**
     * Establish connection to NATS server with JetStream enabled
     */
    connect(config: NatsConnectionConfig): Promise<void>;
    /**
     * Disconnect from NATS server
     */
    disconnect(): Promise<void>;
    /**
     * Get NATS connection instance
     */
    getConnection(): NatsConnection | null;
    /**
     * Get JetStream client instance
     */
    getJetStream(): JetStreamClient | null;
    /**
     * Get string codec for message encoding/decoding
     */
    getCodec(): ReturnType<typeof StringCodec>;
    /**
     * Check if connected to NATS
     */
    get isConnected(): boolean;
    /**
     * Get connection health status
     */
    getHealthStatus(): Promise<NatsHealthResult>;
    /**
     * Generate unique message ID
     */
    generateMessageId(prefix?: string): string;
    /**
     * Setup connection event handlers for monitoring and logging
     */
    private setupConnectionHandlers;
    /**
     * Handle connection status monitoring
     */
    private handleConnectionStatus;
}
