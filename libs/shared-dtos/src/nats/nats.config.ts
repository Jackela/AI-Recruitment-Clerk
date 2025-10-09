/**
 * Defines the shape of the nats stream config.
 */
export interface NatsStreamConfig {
  name: string;
  subjects: string[];
  retention: 'limits' | 'interest' | 'workqueue';
  max_age: number; // nanoseconds
  max_msgs: number;
  discard: 'old' | 'new';
  duplicate_window: number; // nanoseconds
}

/**
 * Defines the shape of the nats consumer config.
 */
export interface NatsConsumerConfig {
  durable_name: string;
  filter_subject: string;
  deliver_policy: 'all' | 'last' | 'new' | 'by_start_sequence' | 'by_start_time';
  ack_policy: 'none' | 'all' | 'explicit';
  max_deliver: number;
  ack_wait: number; // nanoseconds
}

export const NATS_STREAMS: Record<string, NatsStreamConfig> = {
  JOB_EVENTS: {
    name: 'JOB_EVENTS',
    subjects: ['job.*', 'analysis.*'],
    retention: 'limits',
    max_age: 7 * 24 * 60 * 60 * 1000 * 1000000, // 7 days in nanoseconds
    max_msgs: 10000,
    discard: 'old',
    duplicate_window: 2 * 60 * 1000 * 1000000, // 2 minutes for deduplication
  },
  ERROR_EVENTS: {
    name: 'ERROR_EVENTS',
    subjects: ['*.error', '*.failed'],
    retention: 'limits',
    max_age: 30 * 24 * 60 * 60 * 1000 * 1000000, // 30 days in nanoseconds
    max_msgs: 50000,
    discard: 'old',
    duplicate_window: 5 * 60 * 1000 * 1000000, // 5 minutes for deduplication
  }
};

export const NATS_CONNECTION_OPTIONS = {
  maxReconnectAttempts: 10,
  reconnectTimeWait: 2000,
  timeout: 10000, // 10 seconds connection timeout
  pingInterval: 30000, // 30 seconds ping interval
  maxPingOut: 3,
  pedantic: false,
  verbose: false,
};

export const CONSUMER_DEFAULTS: Partial<NatsConsumerConfig> = {
  deliver_policy: 'new',
  ack_policy: 'explicit',
  max_deliver: 3,
  ack_wait: 30 * 1000 * 1000000, // 30 seconds in nanoseconds
};

export const PUBLISH_OPTIONS = {
  timeout: 5000, // 5 seconds publish timeout
  retries: 3,
  retryDelay: 1000, // 1 second between retries
};

// Dead Letter Queue configuration
export const DLQ_CONFIG = {
  max_deliver: 3,
  ack_wait: 30 * 1000 * 1000000, // 30 seconds
  retry_backoff: [1000, 5000, 15000], // exponential backoff in milliseconds
};

// Health check configuration
export const HEALTH_CHECK_CONFIG = {
  interval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
  retries: 3,
};