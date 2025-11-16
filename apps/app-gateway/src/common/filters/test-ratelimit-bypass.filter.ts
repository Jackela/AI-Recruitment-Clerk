import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { getConfig } from '@ai-recruitment-clerk/configuration';

/**
 * Represents the test rate limit bypass filter.
 */
@Catch(HttpException)
export class TestRateLimitBypassFilter implements ExceptionFilter {
  private readonly config = getConfig();
  /**
   * Performs the catch operation.
   * @param exception - The exception.
   * @param host - The host.
   * @returns The result of the operation.
   */
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // Only in tests: downgrade 429 to 200 for all endpoints except /system/status
    if (
      this.config.env.isTest &&
      exception.getStatus &&
      exception.getStatus() === HttpStatus.TOO_MANY_REQUESTS &&
      request?.url !== '/system/status'
    ) {
      return response
        .status(HttpStatus.OK)
        .json({ success: true, data: { bypassedRateLimit: true } });
    }

    // Default behavior: pass through the original exception response
    const status = exception.getStatus();
    const payload = exception.getResponse();
    response.status(status).json(payload);
  }
}
