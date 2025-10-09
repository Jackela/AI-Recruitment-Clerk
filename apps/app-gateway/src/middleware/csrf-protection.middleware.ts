import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface CsrfRequest extends Request {
  csrfToken?: string;
  session?: {
    csrfToken?: string;
    id?: string;
  };
}

/**
 * Represents the csrf protection middleware.
 */
@Injectable()
export class CsrfProtectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfProtectionMiddleware.name);
  private readonly csrfSecret: string;
  private readonly excludedPaths: string[];
  private readonly safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  /**
   * Initializes a new instance of the Csrf Protection Middleware.
   * @param configService - The config service.
   */
  constructor(private configService: ConfigService) {
    this.csrfSecret =
      this.configService.get<string>('CSRF_SECRET') ||
      'fallback-csrf-secret-change-in-production';
    this.excludedPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/health',
      '/api/docs',
      '/api/guest/upload-resume', // Guest endpoints may need special handling
      '/api/guest/analyze-resume',
    ];
  }

  /**
   * Performs the use operation.
   * @param req - The req.
   * @param res - The res.
   * @param next - The next.
   * @returns The result of the operation.
   */
  use(req: CsrfRequest, res: Response, next: NextFunction) {
    // Skip CSRF protection for safe HTTP methods
    if (this.safeMethods.includes(req.method)) {
      // For GET requests, generate and provide CSRF token
      if (req.method === 'GET') {
        const csrfToken = this.generateCsrfToken(req);
        res.locals.csrfToken = csrfToken;

        // Set CSRF token in response header for client-side access
        res.setHeader('X-CSRF-Token', csrfToken);
      }
      return next();
    }

    // Skip CSRF protection for excluded paths
    if (this.shouldExcludePath(req.path)) {
      this.logger.debug(`Skipping CSRF protection for path: ${req.path}`);
      return next();
    }

    // Skip CSRF protection for API endpoints with valid JWT tokens (stateless authentication)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      this.logger.debug(
        `Skipping CSRF protection for JWT authenticated request: ${req.path}`,
      );
      return next();
    }

    try {
      // Validate CSRF token for state-changing operations
      this.validateCsrfToken(req);
      next();
    } catch (error) {
      this.logger.warn(
        `CSRF validation failed for ${req.method} ${req.path}: ${error.message}`,
        {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          referer: req.get('Referer'),
          sessionId: req.session?.id,
        },
      );

      throw new ForbiddenException('CSRF token validation failed');
    }
  }

  private shouldExcludePath(path: string): boolean {
    return this.excludedPaths.some(
      (excludedPath) =>
        path.startsWith(excludedPath) || path.includes(excludedPath),
    );
  }

  private generateCsrfToken(req: CsrfRequest): string {
    // Generate a session-specific CSRF token
    const sessionId = req.session?.id || req.ip || 'anonymous';
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(16).toString('hex');

    const tokenData = `${sessionId}:${timestamp}:${randomBytes}`;
    const hmac = crypto.createHmac('sha256', this.csrfSecret);
    hmac.update(tokenData);
    const signature = hmac.digest('hex');

    const csrfToken = `${tokenData}:${signature}`;

    // Store token in session if available
    if (req.session) {
      req.session.csrfToken = csrfToken;
    }

    req.csrfToken = csrfToken;
    return csrfToken;
  }

  private validateCsrfToken(req: CsrfRequest): void {
    // Get CSRF token from various possible sources
    const csrfToken = this.extractCsrfToken(req);

    if (!csrfToken) {
      throw new Error('CSRF token is missing');
    }

    // Parse the token
    const tokenParts = csrfToken.split(':');
    if (tokenParts.length !== 4) {
      throw new Error('Invalid CSRF token format');
    }

    const [sessionId, timestamp, randomBytes, providedSignature] = tokenParts;

    // Verify token signature
    const tokenData = `${sessionId}:${timestamp}:${randomBytes}`;
    const hmac = crypto.createHmac('sha256', this.csrfSecret);
    hmac.update(tokenData);
    const expectedSignature = hmac.digest('hex');

    if (providedSignature !== expectedSignature) {
      throw new Error('CSRF token signature is invalid');
    }

    // Check token age (valid for 24 hours)
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (tokenAge > maxAge) {
      throw new Error('CSRF token has expired');
    }

    // Verify session consistency (if session is available)
    const currentSessionId = req.session?.id || req.ip || 'anonymous';
    if (sessionId !== currentSessionId) {
      // Allow IP-based validation as fallback
      const fallbackSessionId = req.ip || 'anonymous';
      if (sessionId !== fallbackSessionId) {
        throw new Error('CSRF token session mismatch');
      }
    }

    this.logger.debug(
      `CSRF token validated successfully for ${req.method} ${req.path}`,
    );
  }

  private extractCsrfToken(req: CsrfRequest): string | null {
    // Check multiple sources for CSRF token
    return (
      (req.headers['x-csrf-token'] as string) ||
      (req.headers['x-xsrf-token'] as string) ||
      req.body?.csrfToken ||
      (req.query?.csrfToken as string) ||
      req.session?.csrfToken ||
      null
    );
  }
}

// Utility function to generate CSRF token for use in controllers
/**
 * Generates csrf token for response.
 * @param secret - The secret.
 * @param sessionId - The session id.
 * @returns The string value.
 */
export function generateCsrfTokenForResponse(
  secret: string,
  sessionId: string,
): string {
  const timestamp = Date.now().toString();
  const randomBytes = crypto.randomBytes(16).toString('hex');

  const tokenData = `${sessionId}:${timestamp}:${randomBytes}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(tokenData);
  const signature = hmac.digest('hex');

  return `${tokenData}:${signature}`;
}
