/**
 * App Gateway Global Exception Filter
 *
 * This filter is now configured via ErrorHandlingModule in app.module.ts.
 * The ErrorHandlingModule provides a standardized global exception filter
 * with correlation, structured logging, and performance tracking.
 *
 * This file is kept for backwards compatibility and re-exports the shared filter.
 *
 * @see {@link https://github.com/anthropics/claude-code/blob/main/docs/ERROR_HANDLING.md}
 */

// Re-export the standardized filter from shared-dtos
export {
  StandardizedGlobalExceptionFilter,
  createGlobalExceptionFilter,
  ExceptionFilterConfigHelper,
  type GlobalExceptionFilterConfig,
} from '@ai-recruitment-clerk/shared-dtos';

// Legacy export for backwards compatibility
import {
  StandardizedGlobalExceptionFilter,
  ExceptionFilterConfigHelper,
} from '@ai-recruitment-clerk/shared-dtos';

/**
 * App Gateway specific global exception filter
 * Extends the standardized filter with service-specific configuration
 *
 * @deprecated The ErrorHandlingModule automatically provides global error handling.
 * This class is kept for backwards compatibility only.
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
