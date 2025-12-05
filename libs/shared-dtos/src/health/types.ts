/**
 * Canonical health check types - Single Source of Truth (SSOT)
 * All health-related interfaces should be imported from here.
 */

/**
 * Health status enumeration for consistent status reporting.
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Defines the shape of an individual service health check result.
 */
export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  lastCheck: Date;
  responseTime?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Defines the shape of the overall system health.
 */
export interface SystemHealth {
  overall: HealthStatus;
  services: ServiceHealth[];
  timestamp: Date;
  uptime: number;
  version: string;
}

/**
 * Defines the shape of a health check configuration.
 */
export interface HealthCheckConfig {
  name: string;
  url?: string;
  timeout?: number;
  interval?: number;
  enabled?: boolean;
  healthCheck?: () => Promise<HealthCheckResult>;
}

/**
 * Defines the shape of a health check result.
 */
export interface HealthCheckResult {
  healthy: boolean;
  metadata?: Record<string, unknown>;
  error?: string;
  responseTime?: number;
}

/**
 * Defines the shape of a health response for API endpoints.
 */
export interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  service: string;
  version?: string;
  details?: Record<string, unknown>;
}

/**
 * Defines the shape of detailed health check information.
 */
export interface HealthCheckDetails {
  database?: {
    status: HealthStatus;
    latency?: number;
  };
  nats?: {
    status: HealthStatus;
    connected?: boolean;
  };
  external?: {
    status: HealthStatus;
    services?: Record<string, HealthStatus>;
  };
}
