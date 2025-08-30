import { RetentionPolicy, DiscardPolicy, DeliverPolicy, AckPolicy } from 'nats';

/**
 * NATS connection configuration interface
 */
export interface NatsConnectionConfig {
  /** NATS server URL(s) */
  url: string | string[];
  
  /** Service name for connection identification */
  serviceName: string;
  
  /** Whether NATS connection is optional (for development) */
  optional?: boolean;
  
  /** Connection timeout in milliseconds */
  timeout?: number;
  
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  
  /** Reconnection wait time in milliseconds */
  reconnectTimeWait?: number;
}

/**
 * JetStream stream configuration
 */
export interface StreamConfig {
  /** Stream name */
  name: string;
  
  /** Subjects handled by this stream */
  subjects: string[];
  
  /** Retention policy */
  retention: RetentionPolicy;
  
  /** Maximum age in nanoseconds */
  maxAge?: number;
  
  /** Maximum number of messages */
  maxMsgs?: number;
  
  /** Discard policy when limits are reached */
  discard?: DiscardPolicy;
  
  /** Duplicate window in nanoseconds */
  duplicateWindow?: number;
}

/**
 * Consumer configuration for subscriptions
 */
export interface ConsumerConfig {
  /** Durable consumer name */
  durableName: string;
  
  /** Subject filter */
  filterSubject: string;
  
  /** Delivery policy */
  deliverPolicy?: DeliverPolicy;
  
  /** Acknowledgment policy */
  ackPolicy?: AckPolicy;
  
  /** Maximum delivery attempts */
  maxDeliver?: number;
  
  /** Acknowledgment wait time in nanoseconds */
  ackWait?: number;
  
  /** Queue group name for load balancing */
  queueGroup?: string;
}

/**
 * Subscription options
 */
export interface SubscriptionOptions extends Partial<ConsumerConfig> {
  /** Custom message handler timeout */
  handlerTimeout?: number;
  
  /** Enable automatic retry on handler errors */
  autoRetry?: boolean;
  
  /** Number of retry attempts */
  retryAttempts?: number;
  
  /** Retry delay in milliseconds */
  retryDelay?: number;
}

/**
 * Message handler function signature
 */
export type MessageHandler<T = unknown> = (data: T, metadata?: MessageMetadata) => Promise<void>;

/**
 * Message metadata
 */
export interface MessageMetadata {
  /** Message subject */
  subject: string;
  
  /** Message sequence number */
  sequence: number;
  
  /** Message timestamp */
  timestamp: Date;
  
  /** Number of delivery attempts */
  deliveryAttempt: number;
  
  /** Message ID */
  messageId?: string;
}