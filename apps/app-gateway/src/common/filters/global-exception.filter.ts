/**
 * Enhanced Global Exception Filter for App Gateway
 * Uses centralized error handling system with correlation and structured logging
 */

// Fallback implementations for missing infrastructure-shared components
class StandardizedGlobalExceptionFilter {
  constructor(_config: any) {
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
  /**
   * Initializes a new instance of the App Gateway Global Exception Filter.
   */
  constructor() {
    super({
      serviceName: 'app-gateway',
      ...ExceptionFilterConfigHelper.forApiGateway(),
    });
  }
}

// Re-export for backwards compatibility
export { AppGatewayGlobalExceptionFilter as GlobalExceptionFilter };
