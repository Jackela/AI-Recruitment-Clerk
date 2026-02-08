import type { StreamConfig } from '../interfaces/nats-config.interface';
/**
 * Standard JOB_EVENTS stream configuration used across all services
 */
export declare const JOB_EVENTS_STREAM: StreamConfig;
/**
 * Error tracking stream for failed operations
 */
export declare const ERROR_EVENTS_STREAM: StreamConfig;
/**
 * Performance metrics stream for monitoring
 */
export declare const METRICS_STREAM: StreamConfig;
/**
 * Default stream configurations
 */
export declare const DEFAULT_STREAMS: StreamConfig[];
/**
 * Stream configuration factory
 */
export declare class StreamConfigFactory {
    /**
     * Create a custom stream configuration
     */
    static create(name: string, subjects: string[], options?: Partial<Omit<StreamConfig, 'name' | 'subjects'>>): StreamConfig;
    /**
     * Create development-friendly stream configuration
     */
    static createDev(name: string, subjects: string[], options?: Partial<Omit<StreamConfig, 'name' | 'subjects'>>): StreamConfig;
    /**
     * Create production-optimized stream configuration
     */
    static createProd(name: string, subjects: string[], options?: Partial<Omit<StreamConfig, 'name' | 'subjects'>>): StreamConfig;
}
