/**
 * Result interface for NATS publish operations
 */
export interface NatsPublishResult {
  /** Whether the publish operation was successful */
  success: boolean;

  /** Message ID assigned by NATS JetStream */
  messageId?: string;

  /** Sequence number assigned by the stream */
  sequence?: number;

  /** Error message if the operation failed */
  error?: string;

  /** Additional metadata */
  metadata?: {
    /** Subject the message was published to */
    subject: string;

    /** Timestamp of the publish operation */
    timestamp: Date;

    /** Processing time in milliseconds */
    processingTimeMs?: number;
  };
}

/**
 * Health check result for NATS connection
 */
export interface NatsHealthResult {
  /** Whether NATS is healthy and connected */
  healthy: boolean;

  /** Connection status */
  connected: boolean;

  /** JetStream availability */
  jetstreamAvailable: boolean;

  /** Number of active subscriptions */
  subscriptionCount: number;

  /** Last successful operation timestamp */
  lastOperationTime?: Date;

  /** Error message if unhealthy */
  error?: string;

  /** Additional connection metadata */
  metadata?: {
    /** Current server URL */
    currentServer?: string;

    /** Number of reconnection attempts */
    reconnectAttempts?: number;

    /** Connection uptime in milliseconds */
    uptimeMs?: number;
  };
}

/**
 * Stream information result
 */
export interface StreamInfo {
  /** Stream name */
  name: string;

  /** Stream subjects */
  subjects: string[];

  /** Number of messages in stream */
  messageCount: number;

  /** Number of consumers */
  consumerCount: number;

  /** Stream creation timestamp */
  created: Date;

  /** Last message timestamp */
  lastMessage?: Date;
}

/**
 * Consumer information result
 */
export interface ConsumerInfo {
  /** Consumer name */
  name: string;

  /** Stream name */
  streamName: string;

  /** Filter subject */
  subject: string;

  /** Number of delivered messages */
  delivered: number;

  /** Number of acknowledged messages */
  acknowledged: number;

  /** Number of pending messages */
  pending: number;

  /** Consumer creation timestamp */
  created: Date;

  /** Last activity timestamp */
  lastActivity?: Date;
}
