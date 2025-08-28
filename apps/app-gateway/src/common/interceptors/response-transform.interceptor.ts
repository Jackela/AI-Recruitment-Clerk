import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasNext?: boolean;
    processingTime?: number;
  };
}

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    return next.handle().pipe(
      map((data) => {
        const processingTime = Date.now() - startTime;
        
        // If the controller already returns a structured response, use it
        if (data && typeof data === 'object' && 'success' in data) {
          return {
            ...data,
            statusCode: data.statusCode || response.statusCode || HttpStatus.OK,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            meta: {
              ...data.meta,
              processingTime,
            },
          };
        }

        // Otherwise, wrap the data in standard response format
        return {
          success: true,
          data,
          statusCode: response.statusCode || HttpStatus.OK,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          meta: {
            processingTime,
          },
        };
      }),
    );
  }
}