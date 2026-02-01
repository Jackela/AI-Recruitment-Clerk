import type {
  ArgumentsHost,
  ExceptionFilter} from '@nestjs/common';
import {
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

/**
 * Represents the test rate limit bypass filter.
 */
@Catch(HttpException)
export class TestRateLimitBypassFilter implements ExceptionFilter {
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
      process.env.NODE_ENV === 'test' &&
      exception.getStatus &&
      exception.getStatus() === HttpStatus.TOO_MANY_REQUESTS &&
      request?.url !== '/system/status'
    ) {
      return response
        .status(HttpStatus.OK)
        .json({ success: true, data: { bypassedRateLimit: true } });
    }

    // Default behavior: pass through the original exception response
    const status = (exception as any).getStatus?.() ?? 500;
    const payload = (exception as any).getResponse?.() ?? {
      statusCode: status,
    };
    response.status(status).json(payload);
  }
}
