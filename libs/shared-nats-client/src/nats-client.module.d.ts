import type { DynamicModule } from '@nestjs/common';
import type { StreamConfig, NatsConnectionConfig } from './interfaces/nats-config.interface';
/**
 * Shared NATS Client Module
 *
 * Provides NATS JetStream messaging capabilities across microservices.
 * This module is marked as @Global() so it can be imported once at the root
 * and used throughout the application.
 *
 * Features:
 * - Automatic connection management and reconnection
 * - JetStream stream and consumer management
 * - High-level publish/subscribe API
 * - Health monitoring and diagnostics
 * - Service-specific extensions support
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [NatsClientModule],
 * })
 * export class AppModule {}
 * ```
 *
 * Environment Variables:
 * - NATS_URL: NATS server connection URL (default: nats://localhost:4222)
 * - NATS_OPTIONAL: Whether NATS is optional for development (default: false)
 *
 * @author AI Recruitment Team
 * @since 1.0.0
 */
export declare class NatsClientModule {
    /**
     * Create a configured NATS Client Module with custom settings
     *
     * @param options Configuration options for the NATS client
     * @returns Configured module
     *
     * @example
     * ```typescript
     * @Module({
     *   imports: [
     *     NatsClientModule.forRoot({
     *       serviceName: 'my-service',
     *       streams: [CUSTOM_STREAM],
     *     }),
     *   ],
     * })
     * export class AppModule {}
     * ```
     */
    static forRoot(options?: {
        serviceName?: string;
        streams?: StreamConfig[];
        connectionOptions?: Partial<NatsConnectionConfig>;
    }): DynamicModule;
}
