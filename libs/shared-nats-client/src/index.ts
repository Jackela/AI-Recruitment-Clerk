/**
 * Shared NATS Client Library
 *
 * A comprehensive NATS JetStream client library for AI Recruitment Clerk microservices.
 * Provides unified messaging infrastructure with connection management, stream handling,
 * and service-specific extensions.
 *
 * @author AI Recruitment Team
 * @version 1.0.0
 * @since 1.0.0
 */

// Core module
export { NatsClientModule } from './nats-client.module';

// Services
export { NatsClientService } from './services/nats-client.service';
export { NatsConnectionManager } from './services/nats-connection-manager.service';
export { NatsStreamManager } from './services/nats-stream-manager.service';

// Interfaces and types
export * from './interfaces/nats-config.interface';
export * from './interfaces/nats-result.interface';

// Stream configurations
export * from './config/stream-configs';

// Re-export commonly used NATS types for convenience
export {
  RetentionPolicy,
  DiscardPolicy,
  DeliverPolicy,
  AckPolicy,
  StringCodec,
} from 'nats';
