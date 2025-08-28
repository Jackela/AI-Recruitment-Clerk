/**
 * Swagger 文档缓存拦截器
 * AI Recruitment Clerk - API文档缓存优化
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';

@Injectable()
export class SwaggerCacheInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // 只对 API 文档路径进行缓存
    if (!request.url.includes('/api/docs')) {
      return next.handle();
    }

    const cacheKey = this.cacheService.getApiDocsCacheKey();
    
    // 尝试从缓存获取
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      // 设置响应头，表明来自缓存
      response.set('X-Cache', 'HIT');
      response.set('Cache-Control', 'public, max-age=300'); // 5分钟
      return new Observable(observer => {
        observer.next(cachedData);
        observer.complete();
      });
    }

    // 缓存未命中，继续执行并缓存结果
    return next.handle().pipe(
      tap(async (data) => {
        if (data) {
          await this.cacheService.set(cacheKey, data, { ttl: 300 }); // 5分钟缓存
          response.set('X-Cache', 'MISS');
          response.set('Cache-Control', 'public, max-age=300');
        }
      }),
    );
  }
}