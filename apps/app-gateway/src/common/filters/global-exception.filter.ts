/**
 * Enhanced Global Exception Filter for App Gateway
 * Uses centralized error handling system with correlation and structured logging
 */

import { StandardizedGlobalExceptionFilter, ExceptionFilterConfigHelper } from '@ai-recruitment-clerk/infrastructure-shared';

/**
 * App Gateway specific global exception filter
 * Extends the standardized filter with service-specific configuration
 */
export class AppGatewayGlobalExceptionFilter extends StandardizedGlobalExceptionFilter {
  constructor() {
    super({
      serviceName: 'app-gateway',
      ...ExceptionFilterConfigHelper.forApiGateway()
    });
  }
}

// Re-export for backwards compatibility
export { AppGatewayGlobalExceptionFilter as GlobalExceptionFilter };