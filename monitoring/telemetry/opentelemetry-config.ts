/**
 * OpenTelemetry Configuration for AI Recruitment System
 * Comprehensive APM setup with distributed tracing, metrics, and logging
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { MongooseInstrumentation } from '@opentelemetry/instrumentation-mongoose';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis-4';

export interface TelemetryConfig {
  serviceName: string;
  environment: 'development' | 'staging' | 'production';
  jaegerEndpoint?: string;
  prometheusPort?: number;
  enableTracing: boolean;
  enableMetrics: boolean;
  enableLogging: boolean;
  sampleRate: number;
}

export class OpenTelemetryConfig {
  private sdk: NodeSDK | null = null;
  private config: TelemetryConfig;

  constructor(config: TelemetryConfig) {
    this.config = {
      prometheusPort: 9090,
      sampleRate: 1.0,
      ...config,
    };
  }

  /**
   * Initialize OpenTelemetry SDK with comprehensive instrumentation
   */
  public initialize(): void {
    try {
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
        [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'ai-recruitment',
        [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'unknown',
      });

      // Configure instrumentations
      const instrumentations = [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable fs instrumentation to reduce noise
          },
        }),
        new HttpInstrumentation({
          requestHook: (span, request) => {
            span.setAttributes({
              'http.request.body.size': request.headers['content-length'] || 0,
              'http.user_agent': request.headers['user-agent'] || 'unknown',
            });
          },
          responseHook: (span, response) => {
            span.setAttributes({
              'http.response.body.size': response.headers['content-length'] || 0,
            });
          },
        }),
        new ExpressInstrumentation({
          enabled: this.config.enableTracing,
        }),
        new MongooseInstrumentation({
          enabled: this.config.enableTracing,
        }),
        new RedisInstrumentation({
          enabled: this.config.enableTracing,
        }),
        new WinstonInstrumentation({
          enabled: this.config.enableLogging,
        }),
      ];

      // Configure trace exporter
      const traceExporter = this.config.jaegerEndpoint
        ? new JaegerExporter({
            endpoint: this.config.jaegerEndpoint,
          })
        : undefined;

      // Configure metrics exporter
      const metricsReader = this.config.enableMetrics
        ? new PeriodicExportingMetricReader({
            exporter: new PrometheusExporter({
              port: this.config.prometheusPort,
            }),
            exportIntervalMillis: 5000,
          })
        : undefined;

      // Initialize SDK
      this.sdk = new NodeSDK({
        resource,
        instrumentations,
        traceExporter,
        metricReader: metricsReader,
      });

      this.sdk.start();
      console.log(`✅ OpenTelemetry initialized for service: ${this.config.serviceName}`);
    } catch (error) {
      console.error('❌ Failed to initialize OpenTelemetry:', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown OpenTelemetry SDK
   */
  public async shutdown(): Promise<void> {
    if (this.sdk) {
      try {
        await this.sdk.shutdown();
        console.log('✅ OpenTelemetry SDK shutdown complete');
      } catch (error) {
        console.error('❌ Error during OpenTelemetry shutdown:', error);
      }
    }
  }

  /**
   * Get service configuration for monitoring setup
   */
  public getServiceConfig() {
    return {
      serviceName: this.config.serviceName,
      environment: this.config.environment,
      metricsEndpoint: `http://localhost:${this.config.prometheusPort}/metrics`,
      tracingEnabled: this.config.enableTracing,
      metricsEnabled: this.config.enableMetrics,
    };
  }
}

/**
 * Factory function to create OpenTelemetry configuration for different services
 */
export function createTelemetryConfig(serviceName: string): OpenTelemetryConfig {
  const config: TelemetryConfig = {
    serviceName,
    environment: (process.env.NODE_ENV as any) || 'development',
    jaegerEndpoint: process.env.JAEGER_ENDPOINT,
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
    enableTracing: process.env.ENABLE_TRACING !== 'false',
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    enableLogging: process.env.ENABLE_LOGGING !== 'false',
    sampleRate: parseFloat(process.env.TRACE_SAMPLE_RATE || '1.0'),
  };

  return new OpenTelemetryConfig(config);
}

/**
 * Pre-configured telemetry setups for each microservice
 */
export const TelemetrySetups = {
  'app-gateway': () => createTelemetryConfig('ai-recruitment-gateway'),
  'resume-parser-svc': () => createTelemetryConfig('ai-recruitment-resume-parser'),
  'jd-extractor-svc': () => createTelemetryConfig('ai-recruitment-jd-extractor'),
  'scoring-engine-svc': () => createTelemetryConfig('ai-recruitment-scoring-engine'),
  'report-generator-svc': () => createTelemetryConfig('ai-recruitment-report-generator'),
  'ai-recruitment-frontend': () => createTelemetryConfig('ai-recruitment-frontend'),
};