// Exception Filter Implementation

import type { ExceptionFilterConfig, ExecutionHost } from '../common/interfaces';

/**
 * Represents the standardized global exception filter.
 */
export class StandardizedGlobalExceptionFilter {
  private readonly _config?: ExceptionFilterConfig;

  /**
   * Initializes a new instance of the Standardized Global Exception Filter.
   * @param config - The config.
   */
  constructor(config?: ExceptionFilterConfig) {
    this._config = config;
  }
  /**
   * Performs the catch operation.
   * @param exception - The exception.
   * @param _host - The host.
   * @returns The result of the operation.
   */
  public catch(exception: Error | unknown, _host: ExecutionHost): void {
    // Basic error handling
    // Touch config to satisfy TS6133/TS6138 when not used by minimal impl
    void this._config;
    console.error('Global Exception:', exception);
  }
}

/**
 * Represents the exception filter config helper.
 */
export class ExceptionFilterConfigHelper {
  /**
   * Performs the for api gateway operation.
   * @returns The result of the operation.
   */
  public static forApiGateway(): { enableCorrelation: boolean } {
    return { enableCorrelation: true };
  }
  /**
   * Performs the for processing service operation.
   * @returns The result of the operation.
   */
  public static forProcessingService(): { enableLogging: boolean } {
    return { enableLogging: true };
  }
}

/**
 * Creates global exception filter.
 * @param _serviceName - The service name.
 * @param _config - The config.
 * @returns The result of the operation.
 */
export function createGlobalExceptionFilter(
  _serviceName: string,
  _config?: ExceptionFilterConfig,
): StandardizedGlobalExceptionFilter {
  return new StandardizedGlobalExceptionFilter(_config);
}
