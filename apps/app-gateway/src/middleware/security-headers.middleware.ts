import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

interface SecurityRequest extends Request {
  securityContext?: {
    riskScore: number;
    isHighRisk: boolean;
    securityFlags: string[];
  };
}

/**
 * Represents the security headers middleware.
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityHeadersMiddleware.name);

  /**
   * Initializes a new instance of the Security Headers Middleware.
   * @param configService - The config service.
   */
  constructor(private configService: ConfigService) {}

  /**
   * Performs the use operation.
   * @param req - The req.
   * @param res - The res.
   * @param next - The next.
   * @returns The result of the operation.
   */
  use(req: SecurityRequest, res: Response, next: NextFunction) {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const corsOrigin =
      this.configService.get<string>('CORS_ORIGIN') || 'http://localhost:4200';
    const enableSecurityLogging =
      this.configService.get<string>('ENABLE_SECURITY_LOGGING') === 'true';

    // Security risk assessment
    const securityContext = this.assessSecurityRisk(req);
    req.securityContext = securityContext;

    // Enhanced Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      isProduction
        ? "script-src 'self' 'sha256-xyz123' 'nonce-${this.generateNonce()}'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://generativelanguage.googleapis.com https://api.gemini.google.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "media-src 'self'",
      "worker-src 'self'",
      "manifest-src 'self'",
      'upgrade-insecure-requests',
    ];

    // Production-grade CSP
    if (isProduction) {
      cspDirectives.push('block-all-mixed-content');
      cspDirectives.push("require-trusted-types-for 'script'");
    }

    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

    // Enhanced Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Enhanced Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      [
        'accelerometer=()',
        'ambient-light-sensor=()',
        'autoplay=()',
        'battery=()',
        'camera=()',
        'cross-origin-isolated=()',
        'display-capture=()',
        'document-domain=()',
        'encrypted-media=()',
        'execution-while-not-rendered=()',
        'execution-while-out-of-viewport=()',
        'fullscreen=()',
        'geolocation=()',
        'gyroscope=()',
        'keyboard-map=()',
        'magnetometer=()',
        'microphone=()',
        'midi=()',
        'navigation-override=()',
        'payment=()',
        'picture-in-picture=()',
        'publickey-credentials-get=()',
        'screen-wake-lock=()',
        'sync-xhr=()',
        'usb=()',
        'web-share=()',
        'xr-spatial-tracking=()',
      ].join(', '),
    );

    // HSTS with enhanced security (production only)
    if (isProduction) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload',
      );
    }

    // Additional Security Headers
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Cache Control for sensitive endpoints
    if (this.isSensitiveEndpoint(req.path)) {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }

    // CORS Headers (enhanced security)
    const allowedOrigins = corsOrigin.split(',').map((origin) => origin.trim());
    const requestOrigin = req.get('Origin');

    if (allowedOrigins.includes(requestOrigin || '')) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin!);
    } else if (!isProduction && allowedOrigins[0]) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token, X-XSRF-Token, X-API-Key',
    );
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Security monitoring headers
    res.setHeader('X-Request-ID', this.generateRequestId());
    res.setHeader('X-Security-Score', securityContext.riskScore.toString());

    if (securityContext.isHighRisk) {
      res.setHeader('X-Security-Warning', 'high-risk-request');
    }

    // Remove server fingerprinting headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    res.setHeader('Server', 'nginx'); // Generic server header

    // Security logging
    if (enableSecurityLogging && securityContext.isHighRisk) {
      this.logger.warn(
        `High-risk request detected: ${req.method} ${req.path}`,
        {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          referer: req.get('Referer'),
          riskScore: securityContext.riskScore,
          securityFlags: securityContext.securityFlags,
        },
      );
    }

    next();
  }

  private assessSecurityRisk(req: Request): {
    riskScore: number;
    isHighRisk: boolean;
    securityFlags: string[];
  } {
    let riskScore = 0;
    const securityFlags: string[] = [];

    // Check for suspicious patterns
    const userAgent = req.get('User-Agent') || '';
    const referer = req.get('Referer') || '';

    // Bot detection
    if (/bot|crawler|spider|scraper/i.test(userAgent)) {
      riskScore += 0.2;
      securityFlags.push('bot_detected');
    }

    // Missing User-Agent (suspicious)
    if (!userAgent) {
      riskScore += 0.3;
      securityFlags.push('missing_user_agent');
    }

    // Suspicious file extensions in path
    if (/\.(exe|bat|cmd|scr|pif|jar)$/i.test(req.path)) {
      riskScore += 0.5;
      securityFlags.push('suspicious_file_extension');
    }

    // SQL injection patterns
    if (
      /('|(union|select|insert|update|delete|drop|exec|script))/i.test(req.url)
    ) {
      riskScore += 0.7;
      securityFlags.push('sql_injection_pattern');
    }

    // XSS patterns
    if (/<script|javascript:|data:text\/html/i.test(req.url)) {
      riskScore += 0.6;
      securityFlags.push('xss_pattern');
    }

    // Path traversal
    if (/\.\.|\/etc\/|\/proc\/|\/sys\//i.test(req.path)) {
      riskScore += 0.8;
      securityFlags.push('path_traversal');
    }

    // Excessive path length
    if (req.path.length > 2000) {
      riskScore += 0.4;
      securityFlags.push('excessive_path_length');
    }

    return {
      riskScore: Math.min(riskScore, 1.0),
      isHighRisk: riskScore > 0.5,
      securityFlags,
    };
  }

  private isSensitiveEndpoint(path: string): boolean {
    const sensitivePatterns = [
      '/api/auth/',
      '/api/admin/',
      '/api/users/',
      '/api/security/',
      '/api/config/',
    ];

    return sensitivePatterns.some((pattern) => path.startsWith(pattern));
  }

  private generateNonce(): string {
    return require('crypto').randomBytes(16).toString('base64');
  }

  private generateRequestId(): string {
    return require('crypto').randomBytes(8).toString('hex');
  }
}
