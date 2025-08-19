# 🔐 Security Enhancement Implementation Plan

**Target:** Production-Ready Security Baseline  
**Timeline:** 4 Weeks  
**Priority:** Critical for Production Deployment  

---

## 🎯 Implementation Strategy

### **Phase 1: Critical Security Fixes (Week 1-2)**

#### 🔴 **Priority 1: Secrets Management (Days 1-3)**

**Objective:** Replace all hardcoded credentials with secure secrets management

**Tasks:**
1. **Generate Secure Secrets**
   ```bash
   # Create secure secret generation script
   node scripts/generate-production-secrets.js
   ```

2. **Update Docker Configuration**
   - Create `docker-compose.production.yml` with external secrets
   - Implement Docker Secrets or HashiCorp Vault integration
   - Configure environment-specific secret injection

3. **Rotate All Credentials**
   - MongoDB passwords
   - Redis passwords  
   - JWT secrets
   - Encryption keys

**Acceptance Criteria:**
- [ ] No hardcoded secrets in any configuration file
- [ ] All secrets stored in secure external system
- [ ] Secret rotation process documented and tested
- [ ] Production secrets different from development

#### 🔴 **Priority 2: CSRF Protection (Days 4-6)**

**Objective:** Implement comprehensive CSRF protection

**Implementation:**
```typescript
// apps/app-gateway/src/main.ts
import * as csurf from 'csurf';

const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
});

app.use('/api', csrfProtection);
```

**Tasks:**
1. Install and configure CSRF middleware
2. Add CSRF token endpoints
3. Update frontend to include CSRF tokens
4. Test CSRF protection across all endpoints

**Acceptance Criteria:**
- [ ] CSRF middleware active on all state-changing endpoints
- [ ] Frontend properly sends CSRF tokens
- [ ] CSRF validation failures properly handled
- [ ] CSRF tokens rotate on authentication

#### 🔴 **Priority 3: JWT Security Enhancement (Days 7-10)**

**Objective:** Secure JWT implementation with proper secrets and rotation

**Implementation:**
```typescript
// apps/app-gateway/src/auth/jwt-config.service.ts
@Injectable()
export class JwtConfigService {
  private currentKeyId = 'key-1';
  private keys = new Map<string, string>();

  constructor() {
    this.loadKeys();
    this.scheduleKeyRotation();
  }

  private loadKeys() {
    this.keys.set('key-1', process.env.JWT_SECRET_CURRENT);
    this.keys.set('key-2', process.env.JWT_SECRET_PREVIOUS);
  }

  private scheduleKeyRotation() {
    setInterval(() => this.rotateKeys(), 24 * 60 * 60 * 1000); // Daily
  }

  getCurrentKey(): string {
    return this.keys.get(this.currentKeyId);
  }

  getKey(keyId: string): string {
    return this.keys.get(keyId);
  }
}
```

**Tasks:**
1. Implement JWT key rotation service
2. Add key ID to JWT headers
3. Support multiple active keys for validation
4. Configure secure key generation and storage

#### 🔴 **Priority 4: Security Headers (Days 11-14)**

**Objective:** Add comprehensive security headers

**Implementation:**
```typescript
// apps/app-gateway/src/security/security-headers.middleware.ts
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Content Security Policy
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self'; " +
      "font-src 'self'; " +
      "frame-ancestors 'none'"
    );

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 
      'geolocation=(), microphone=(), camera=()'
    );

    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    next();
  }
}
```

### **Phase 2: High Priority Enhancements (Week 3)**

#### 🟡 **Priority 5: Multi-Factor Authentication (Days 15-18)**

**Objective:** Complete MFA implementation for admin accounts

**Implementation:**
```typescript
// apps/app-gateway/src/auth/mfa/mfa.service.ts
@Injectable()
export class MfaService {
  async enableMFA(userId: string, method: 'totp' | 'sms'): Promise<{
    qrCode?: string;
    secret?: string;
    backupCodes: string[];
  }> {
    const user = await this.userService.findById(userId);
    
    if (method === 'totp') {
      const secret = speakeasy.generateSecret({
        name: `AI Recruitment (${user.email})`,
        issuer: 'AI Recruitment Clerk'
      });

      await this.userService.updateMFASecret(userId, secret.base32);
      
      return {
        qrCode: qrCode.imageSync(secret.otpauth_url, { type: 'png' }),
        secret: secret.base32,
        backupCodes: this.generateBackupCodes(userId)
      };
    }
  }

  async verifyMFA(userId: string, token: string): Promise<boolean> {
    const user = await this.userService.findById(userId);
    
    if (!user.mfaSecret) {
      throw new BadRequestException('MFA not enabled');
    }

    return speakeasy.verify({
      secret: user.mfaSecret,
      token,
      encoding: 'base32',
      window: 2
    });
  }
}
```

#### 🟡 **Priority 6: Persistent Security Storage (Days 19-21)**

**Objective:** Implement Redis-based security storage

**Implementation:**
```typescript
// apps/app-gateway/src/security/security-storage.service.ts
@Injectable()
export class SecurityStorageService {
  constructor(
    @Inject('REDIS_CLIENT') private redis: Redis
  ) {}

  // Account lockout tracking
  async recordFailedLogin(identifier: string): Promise<number> {
    const key = `failed_login:${identifier}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 900); // 15 minutes
    return count;
  }

  async isAccountLocked(identifier: string): Promise<boolean> {
    const count = await this.redis.get(`failed_login:${identifier}`);
    return count && parseInt(count) >= 5;
  }

  // Token blacklisting
  async blacklistToken(tokenHash: string, expiresAt: number): Promise<void> {
    const key = `blacklist:${tokenHash}`;
    const ttl = Math.max(expiresAt - Date.now(), 0);
    await this.redis.setex(key, Math.floor(ttl / 1000), '1');
  }

  async isTokenBlacklisted(tokenHash: string): Promise<boolean> {
    const exists = await this.redis.exists(`blacklist:${tokenHash}`);
    return exists === 1;
  }

  // Rate limiting
  async checkRateLimit(
    identifier: string, 
    limit: number, 
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const current = await this.redis.get(key);
    
    if (!current) {
      await this.redis.setex(key, Math.floor(windowMs / 1000), '1');
      return { allowed: true, remaining: limit - 1, resetTime: Date.now() + windowMs };
    }

    const count = parseInt(current);
    if (count >= limit) {
      const ttl = await this.redis.ttl(key);
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: Date.now() + (ttl * 1000) 
      };
    }

    await this.redis.incr(key);
    return { allowed: true, remaining: limit - count - 1, resetTime: Date.now() + windowMs };
  }
}
```

### **Phase 3: Advanced Security Features (Week 4)**

#### 🟠 **Priority 7: Security Monitoring (Days 22-25)**

**Objective:** Implement real-time security monitoring

**Implementation:**
```typescript
// apps/app-gateway/src/security/security-monitor.service.ts
@Injectable()
export class SecurityMonitorService {
  private readonly logger = new Logger(SecurityMonitorService.name);

  async logSecurityEvent(
    event: 'AUTH_FAILURE' | 'RATE_LIMIT' | 'CSRF_VIOLATION' | 'MFA_BYPASS',
    userId?: string,
    ip?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const securityEvent = {
      timestamp: new Date(),
      event,
      userId,
      ip,
      userAgent: details?.userAgent,
      details,
      severity: this.getEventSeverity(event)
    };

    // Log to structured logging system
    this.logger.warn('Security Event', securityEvent);

    // Send to monitoring system
    await this.sendToMonitoring(securityEvent);

    // Check for patterns and trigger alerts
    await this.analyzeSecurityPatterns(event, userId, ip);
  }

  private async analyzeSecurityPatterns(
    event: string, 
    userId?: string, 
    ip?: string
  ): Promise<void> {
    // Detect brute force attacks
    if (event === 'AUTH_FAILURE' && ip) {
      const recentFailures = await this.getRecentFailures(ip);
      if (recentFailures > 10) {
        await this.triggerAlert('BRUTE_FORCE_DETECTED', { ip, failures: recentFailures });
      }
    }

    // Detect account compromise patterns
    if (userId) {
      const suspiciousActivity = await this.detectSuspiciousActivity(userId);
      if (suspiciousActivity) {
        await this.triggerAlert('ACCOUNT_COMPROMISE_SUSPECTED', { userId });
      }
    }
  }
}
```

#### 🟠 **Priority 8: Advanced Rate Limiting (Days 26-28)**

**Objective:** Implement operation-specific rate limiting

**Implementation:**
```typescript
// apps/app-gateway/src/security/advanced-rate-limiter.guard.ts
@Injectable()
export class AdvancedRateLimiterGuard implements CanActivate {
  constructor(
    private securityStorage: SecurityStorageService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rateLimitConfig = this.reflector.get<RateLimitConfig>(
      'rateLimit', 
      context.getHandler()
    ) || this.getDefaultRateLimit(request.method, request.path);

    const identifier = this.getIdentifier(request);
    const result = await this.securityStorage.checkRateLimit(
      identifier,
      rateLimitConfig.limit,
      rateLimitConfig.windowMs
    );

    if (!result.allowed) {
      throw new HttpException({
        message: 'Rate limit exceeded',
        retryAfter: result.resetTime
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    // Set rate limit headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', rateLimitConfig.limit);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', result.resetTime);

    return true;
  }

  private getDefaultRateLimit(method: string, path: string): RateLimitConfig {
    // Different limits for different operations
    if (path.includes('/auth/login')) {
      return { limit: 5, windowMs: 300000 }; // 5 per 5 minutes
    }
    if (path.includes('/resumes/upload')) {
      return { limit: 10, windowMs: 3600000 }; // 10 per hour
    }
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      return { limit: 100, windowMs: 3600000 }; // 100 per hour
    }
    return { limit: 1000, windowMs: 3600000 }; // 1000 per hour for GET
  }
}
```

---

## 🧪 Testing Strategy

### **Security Test Suite**

```typescript
// test/security/comprehensive-security.e2e.spec.ts
describe('Comprehensive Security Validation', () => {
  describe('CSRF Protection', () => {
    it('should reject requests without CSRF token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .send({ title: 'Test Job' });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('CSRF');
    });

    it('should accept requests with valid CSRF token', async () => {
      const csrfToken = await getCsrfToken();
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('X-CSRF-Token', csrfToken)
        .send({ title: 'Test Job' });
      
      expect(response.status).not.toBe(403);
    });
  });

  describe('MFA Implementation', () => {
    it('should enforce MFA for admin operations', async () => {
      const adminToken = await getAdminToken();
      const response = await request(app.getHttpServer())
        .delete('/api/users/123')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('MFA required');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce operation-specific rate limits', async () => {
      const promises = [];
      for (let i = 0; i < 11; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/api/resumes/upload')
            .attach('file', 'test-resume.pdf')
        );
      }
      
      const results = await Promise.all(promises);
      expect(results[10].status).toBe(429);
    });
  });
});
```

### **Penetration Testing Checklist**

- [ ] SQL Injection testing across all endpoints
- [ ] XSS testing with various payloads
- [ ] CSRF bypass attempts
- [ ] Authentication bypass testing
- [ ] Authorization escalation attempts
- [ ] Session management vulnerability testing
- [ ] File upload security testing
- [ ] Rate limiting bypass attempts
- [ ] JWT token manipulation testing
- [ ] MFA bypass testing

---

## 📊 Security Metrics Dashboard

### **Real-time Monitoring**

```typescript
// Monitoring metrics to track
export interface SecurityMetrics {
  authenticationFailures: number;
  rateLimitViolations: number;
  csrfViolations: number;
  mfaBypassAttempts: number;
  suspiciousFileUploads: number;
  tokenBlacklistHits: number;
  accountLockouts: number;
  securityHeaderViolations: number;
}
```

### **Alerting Rules**

```yaml
# security-alerts.yml
alerts:
  - name: BruteForceDetected
    condition: authenticationFailures > 50 per 5 minutes
    severity: critical
    action: block_ip
    
  - name: MassRateLimitViolation
    condition: rateLimitViolations > 1000 per 10 minutes
    severity: high
    action: enable_ddos_protection
    
  - name: CSRFAttackDetected
    condition: csrfViolations > 10 per 1 minute
    severity: high
    action: alert_security_team
```

---

## 🔒 Production Deployment Checklist

### **Pre-Deployment Security Validation**

- [ ] All critical security fixes implemented and tested
- [ ] Security test suite passing (100% coverage)
- [ ] Third-party security scan completed with acceptable results
- [ ] Penetration testing completed by external security firm
- [ ] Security monitoring and alerting operational
- [ ] Incident response procedures documented and tested
- [ ] Security team trained on new security features
- [ ] Production secrets generated and securely stored
- [ ] Security configuration reviewed and approved
- [ ] Disaster recovery procedures include security considerations

### **Post-Deployment Monitoring**

- [ ] Security metrics dashboard operational
- [ ] Automated security scanning scheduled
- [ ] Log aggregation and analysis configured
- [ ] Security incident escalation procedures active
- [ ] Regular security review schedule established

---

## 📞 Emergency Response

### **Security Incident Response Team**
- **Lead:** Security Assessment Specialist
- **Technical Lead:** Platform Architect  
- **Operations:** DevOps Engineer
- **Communications:** Project Manager

### **Incident Severity Levels**
- **P0 (Critical):** Active security breach, production system compromise
- **P1 (High):** Potential security vulnerability actively exploited
- **P2 (Medium):** Security vulnerability discovered, no active exploitation
- **P3 (Low):** Security configuration issue, minimal impact

### **Response Timeframes**
- **P0:** Immediate response (< 15 minutes)
- **P1:** High priority response (< 2 hours)  
- **P2:** Standard response (< 24 hours)
- **P3:** Scheduled response (< 72 hours)

---

*This implementation plan provides a comprehensive roadmap for achieving production-ready security baseline for the AI Recruitment Clerk platform.*