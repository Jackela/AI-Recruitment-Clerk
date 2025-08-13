import { Injectable, ExecutionContext, UnauthorizedException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Request } from 'express';
import { createHash } from 'crypto';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly requestCounts = new Map<string, { count: number; resetTime: number; blocked: boolean }>();
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute
  private readonly RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor(private reflector: Reflector) {
    super();
    // Cleanup expired rate limit entries
    setInterval(() => this.cleanupRateLimits(), this.RATE_LIMIT_CLEANUP_INTERVAL);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Check rate limiting first
    const clientId = this.getClientIdentifier(request);
    if (!this.checkRateLimit(clientId, request.path)) {
      this.logger.warn(`Rate limit exceeded for client: ${clientId} on path: ${request.path}`);
      throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    
    if (err) {
      this.logger.warn(`Authentication error on ${request.path}: ${err.message}`);
      
      // Enhanced error messages based on error type
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired. Please refresh your session.');
      } else if (err.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token format.');
      } else if (err.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token not yet valid.');
      }
      
      throw err;
    }
    
    if (!user) {
      this.logger.warn(`No user found in token for request to ${request.path}`);
      throw new UnauthorizedException('Authentication required');
    }
    
    // Add security headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-Auth-User-Id', user.id);
    response.setHeader('X-Auth-Role', user.role);
    response.setHeader('X-Auth-Organization', user.organizationId);
    
    return user;
  }

  // Rate limiting helper methods
  private getClientIdentifier(request: Request): string {
    // Use IP + User-Agent hash for rate limiting
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const userAgent = request.get('User-Agent') || 'unknown';
    return createHash('sha256').update(`${ip}-${userAgent}`).digest('hex').substring(0, 16);
  }

  private checkRateLimit(clientId: string, path: string): boolean {
    const now = Date.now();
    const key = `${clientId}-${path}`;
    const record = this.requestCounts.get(key);

    if (!record) {
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
        blocked: false
      });
      return true;
    }

    // Reset counter if window has passed
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + this.RATE_LIMIT_WINDOW;
      record.blocked = false;
      return true;
    }

    // Check if already blocked
    if (record.blocked) {
      return false;
    }

    // Increment counter
    record.count++;

    // Block if limit exceeded
    if (record.count > this.RATE_LIMIT_MAX_REQUESTS) {
      record.blocked = true;
      return false;
    }

    return true;
  }

  private cleanupRateLimits(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, record] of this.requestCounts.entries()) {
      if (now > record.resetTime && !record.blocked) {
        this.requestCounts.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired rate limit records`);
    }
  }

  // Get rate limit status for monitoring
  getRateLimitStatus(): {
    activeClients: number;
    blockedClients: number;
    totalRequests: number;
  } {
    const records = Array.from(this.requestCounts.values());
    return {
      activeClients: this.requestCounts.size,
      blockedClients: records.filter(r => r.blocked).length,
      totalRequests: records.reduce((sum, r) => sum + r.count, 0)
    };
  }
}