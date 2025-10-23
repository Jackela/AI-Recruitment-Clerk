import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { createHash } from 'crypto';
import { Reflector } from '@nestjs/core';

/**
 * Defines the shape of the request with device id.
 */
export interface RequestWithDeviceId extends Request {
  deviceId?: string;
  isGuest?: boolean;
}

/**
 * Implements the guest guard logic.
 */
@Injectable()
export class GuestGuard implements CanActivate {
  private readonly logger = new Logger(GuestGuard.name);
  private readonly rateLimitMap = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute for guests

  /**
   * Initializes a new instance of the Guest Guard.
   * @param reflector - The reflector.
   */
  constructor(private _reflector: Reflector) {
    // Cleanup rate limit entries every 5 minutes
    setInterval(() => this.cleanupRateLimits(), 5 * 60 * 1000);
  }

  /**
   * Performs the can activate operation.
   * @param context - The context.
   * @returns A promise that resolves to boolean value.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithDeviceId>();
    const deviceId = this.extractDeviceId(request);

    if (!deviceId) {
      this.logger.warn('Guest access attempt without X-Device-ID header');
      throw new UnauthorizedException(
        'Device ID is required for guest access. Please include X-Device-ID header.',
      );
    }

    // Validate device ID format
    if (!this.isValidDeviceId(deviceId)) {
      this.logger.warn(`Invalid device ID format: ${deviceId}`);
      throw new BadRequestException('Invalid device ID format');
    }

    // Apply rate limiting for guest users
    if (!this.checkRateLimit(request, deviceId)) {
      this.logger.warn(`Rate limit exceeded for guest device: ${deviceId}`);
      throw new HttpException(
        'Too many requests from this device. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Attach device ID to request for use in controllers
    request.deviceId = deviceId;
    request.isGuest = true;

    this.logger.debug(
      `Guest access granted for device: ${this.maskDeviceId(deviceId)}`,
    );
    return true;
  }

  private extractDeviceId(request: Request): string | null {
    const deviceId = request.headers['x-device-id'] as string;
    return deviceId || null;
  }

  private isValidDeviceId(deviceId: string): boolean {
    // Device ID should be a UUID or similar format
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // Check for valid UUID first
    if (uuidPattern.test(deviceId)) {
      return true;
    }

    // Check for incomplete UUID pattern and reject it
    const incompleteUuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}(-[0-9a-f]{0,11})?$/i;
    if (incompleteUuidPattern.test(deviceId)) {
      return false;
    }

    // Allow custom format 8-128 chars (alphanumeric, underscore, hyphen)
    const customIdPattern = /^[a-zA-Z0-9_-]{8,128}$/;
    return customIdPattern.test(deviceId);
  }

  private checkRateLimit(request: Request, deviceId: string): boolean {
    const clientKey = this.generateClientKey(request, deviceId);
    const now = Date.now();
    const record = this.rateLimitMap.get(clientKey);

    if (!record) {
      this.rateLimitMap.set(clientKey, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return true;
    }

    // Reset if window has passed
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + this.RATE_LIMIT_WINDOW;
      return true;
    }

    // Check if limit exceeded
    if (record.count >= this.RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }

    record.count++;
    return true;
  }

  private generateClientKey(request: Request, deviceId: string): string {
    // Combine IP and device ID for rate limiting key
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    return createHash('sha256')
      .update(`${ip}-${deviceId}`)
      .digest('hex')
      .substring(0, 16);
  }

  private maskDeviceId(deviceId: string): string {
    // Mask device ID for logging privacy
    if (deviceId.length <= 8) return '***';
    return (
      deviceId.substring(0, 4) + '***' + deviceId.substring(deviceId.length - 4)
    );
  }

  private cleanupRateLimits(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, record] of this.rateLimitMap.entries()) {
      if (now > record.resetTime) {
        this.rateLimitMap.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(
        `Cleaned up ${cleanedCount} expired guest rate limit records`,
      );
    }
  }

  // Utility method to get rate limit status for monitoring
  /**
   * Retrieves rate limit status.
   * @returns The { activeGuests: number; totalRequests: number; }.
   */
  getRateLimitStatus(): {
    activeGuests: number;
    totalRequests: number;
  } {
    const records = Array.from(this.rateLimitMap.values());
    return {
      activeGuests: this.rateLimitMap.size,
      totalRequests: records.reduce((sum, r) => sum + r.count, 0),
    };
  }
}
