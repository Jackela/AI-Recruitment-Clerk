import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Represents the response transform interceptor.
 */
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  /**
   * Performs the intercept operation.
   * @param context - The context.
   * @param next - The next.
   * @returns The Observable<any>.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data: any) => {
        // If controller already returns a standardized shape, pass through
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data;
        }

        // Wrap all other successful responses for E2E contract tests
        return {
          success: true,
          data,
        };
      }),
    );
  }
}

