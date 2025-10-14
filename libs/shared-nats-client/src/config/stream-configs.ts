import { RetentionPolicy, DiscardPolicy } from 'nats';
import { StreamConfig } from '../interfaces/nats-config.interface';

/**
 * Standard JOB_EVENTS stream configuration used across all services
 */
export const JOB_EVENTS_STREAM: StreamConfig = {
  name: 'JOB_EVENTS',
  subjects: ['job.*', 'analysis.*'],
  retention: RetentionPolicy.Limits,
  maxAge: 7 * 24 * 60 * 60 * 1000 * 1000000, // 7 days in nanoseconds
  maxMsgs: 10000,
  discard: DiscardPolicy.Old,
  duplicateWindow: 2 * 60 * 1000 * 1000000, // 2 minutes for deduplication
};

/**
 * Error tracking stream for failed operations
 */
export const ERROR_EVENTS_STREAM: StreamConfig = {
  name: 'ERROR_EVENTS',
  subjects: ['error.*', 'failure.*'],
  retention: RetentionPolicy.Limits,
  maxAge: 14 * 24 * 60 * 60 * 1000 * 1000000, // 14 days in nanoseconds
  maxMsgs: 50000,
  discard: DiscardPolicy.Old,
  duplicateWindow: 5 * 60 * 1000 * 1000000, // 5 minutes for deduplication
};

/**
 * Performance metrics stream for monitoring
 */
export const METRICS_STREAM: StreamConfig = {
  name: 'METRICS',
  subjects: ['metrics.*', 'performance.*'],
  retention: RetentionPolicy.Limits,
  maxAge: 3 * 24 * 60 * 60 * 1000 * 1000000, // 3 days in nanoseconds
  maxMsgs: 100000,
  discard: DiscardPolicy.Old,
  duplicateWindow: 1 * 60 * 1000 * 1000000, // 1 minute for deduplication
};

/**
 * Default stream configurations
 */
export const DEFAULT_STREAMS: StreamConfig[] = [
  JOB_EVENTS_STREAM,
  ERROR_EVENTS_STREAM,
  METRICS_STREAM,
];

/**
 * Stream configuration factory
 */
export class StreamConfigFactory {
  /**
   * Create a custom stream configuration
   */
  static create(
    name: string,
    subjects: string[],
    options: Partial<Omit<StreamConfig, 'name' | 'subjects'>> = {},
  ): StreamConfig {
    return {
      name,
      subjects,
      retention: RetentionPolicy.Limits,
      maxAge: 7 * 24 * 60 * 60 * 1000 * 1000000, // Default 7 days
      maxMsgs: 10000, // Default 10k messages
      discard: DiscardPolicy.Old,
      duplicateWindow: 2 * 60 * 1000 * 1000000, // Default 2 minutes
      ...options,
    };
  }

  /**
   * Create development-friendly stream configuration
   */
  static createDev(
    name: string,
    subjects: string[],
    options: Partial<Omit<StreamConfig, 'name' | 'subjects'>> = {},
  ): StreamConfig {
    return this.create(name, subjects, {
      maxAge: 1 * 24 * 60 * 60 * 1000 * 1000000, // 1 day for dev
      maxMsgs: 1000, // 1k messages for dev
      duplicateWindow: 30 * 1000 * 1000000, // 30 seconds for dev
      ...options,
    });
  }

  /**
   * Create production-optimized stream configuration
   */
  static createProd(
    name: string,
    subjects: string[],
    options: Partial<Omit<StreamConfig, 'name' | 'subjects'>> = {},
  ): StreamConfig {
    return this.create(name, subjects, {
      maxAge: 30 * 24 * 60 * 60 * 1000 * 1000000, // 30 days for prod
      maxMsgs: 100000, // 100k messages for prod
      duplicateWindow: 10 * 60 * 1000 * 1000000, // 10 minutes for prod
      ...options,
    });
  }
}
