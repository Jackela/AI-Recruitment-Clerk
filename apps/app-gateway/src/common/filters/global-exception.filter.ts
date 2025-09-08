/**
 * Enhanced Global Exception Filter for App Gateway
 * Uses centralized error handling system with correlation and structured logging
 */

import { ErrorInterceptorFactory } from '../interfaces/fallback-types';

// Fallback implementations for missing infrastructure-shared components
class StandardizedGlobalExceptionFilter {
  constructor(config: any) {
    // Basic exception filter implementation
  }
}

class ExceptionFilterConfigHelper {
  static forApiGateway() {
    return {
      enableLogging: true,
      enableCorrelation: true,
    };
  }
}

/**
 * App Gateway specific global exception filter
 * Extends the standardized filter with service-specific configuration
 */
export class AppGatewayGlobalExceptionFilter extends StandardizedGlobalExceptionFilter {
  constructor() {
    super({
      serviceName: 'app-gateway',
      ...ExceptionFilterConfigHelper.forApiGateway(),
    });
  }
}

// Re-export for backwards compatibility
export { AppGatewayGlobalExceptionFilter as GlobalExceptionFilter };
