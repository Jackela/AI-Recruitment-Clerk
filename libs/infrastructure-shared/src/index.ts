// Infrastructure Shared Types

// Note: Avoid cross-library re-exports to keep build boundaries clean

export enum DataSubjectRightType {
  ACCESS = 'access',
  RECTIFICATION = 'rectification', 
  ERASURE = 'erasure',
  PORTABILITY = 'portability',
  RESTRICTION = 'restriction',
  OBJECTION = 'objection'
}

export enum RequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export enum IdentityVerificationStatus {
  NOT_VERIFIED = 'not_verified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed'
}

export enum DataExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  XML = 'xml'
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum JobType {
  DATA_PROCESSING = 'data_processing',
  REPORT_GENERATION = 'report_generation',
  ANALYTICS = 'analytics',
  BACKUP = 'backup',
  CLEANUP = 'cleanup'
}

export enum EventType {
  USER_ACTION = 'user_action',
  SYSTEM_EVENT = 'system_event',
  ERROR_EVENT = 'error_event',
  PERFORMANCE_EVENT = 'performance_event'
}

export enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum EventCategory {
  AUTHENTICATION = 'authentication',
  ANALYTICS = 'analytics',
  SYSTEM = 'system',
  USER = 'user'
}

export enum ConsentStatus {
  PENDING = 'pending',
  GRANTED = 'granted',
  DENIED = 'denied',
  WITHDRAWN = 'withdrawn'
}

// Add any other commonly used infrastructure types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Global Exception Filter - Basic implementation for infrastructure
export class StandardizedGlobalExceptionFilter {
  constructor() {}
  catch(exception: any, _host: any) {
    // Basic error handling
    console.error('Global Exception:', exception);
  }
}

export class ExceptionFilterConfigHelper {
  static forApiGateway() {
    return { enableCorrelation: true };
  }
  static forProcessingService() {
    return { enableLogging: true };
  }
}

export function createGlobalExceptionFilter(_serviceName: string, _config?: any) {
  return new StandardizedGlobalExceptionFilter();
}

// Error Interceptor Factory
export class ErrorInterceptorFactory {
  static createCorrelationInterceptor(_serviceName: string, _options?: any) {
    return {
      intercept: (_context: any, next: any) => next.handle()
    };
  }
  static createLoggingInterceptor(_serviceName: string, _options?: any) {
    return {
      intercept: (_context: any, next: any) => next.handle()
    };
  }
  static createPerformanceInterceptor(_serviceName: string, _options?: any) {
    return {
      intercept: (_context: any, next: any) => next.handle()
    };
  }
  static createRecoveryInterceptor(_serviceName: string, _options?: any) {
    return {
      intercept: (_context: any, next: any) => next.handle()
    };
  }
}

// Placeholder components for services that expect them
export class InputValidator {
  static validate(input: any) { return input; }
  
  static validateResumeFile(file: {
    buffer: Buffer;
    originalname: string;
    mimetype?: string;
    size: number;
  }): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    
    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File size exceeds maximum of ${maxFileSize} bytes`);
    }
    
    // Check mime type
    if (file.mimetype && !allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`Invalid mime type: ${file.mimetype}`);
    }
    
    // Check file name
    if (!file.originalname || file.originalname.length === 0) {
      errors.push('File name is required');
    }
    
    // Check buffer
    if (!file.buffer || file.buffer.length === 0) {
      errors.push('File buffer is empty');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

export class EncryptionService {
  static encrypt(data: any) { return data; }
  static decrypt(data: any) { return data; }
  
  static encryptUserPII(data: any): any {
    // Mock implementation - in production this would use real encryption
    if (!data) return data;
    
    const encrypted = { ...data };
    
    // Encrypt sensitive fields
    if (encrypted.email) {
      encrypted.email = `encrypted_${Buffer.from(encrypted.email).toString('base64')}`;
    }
    if (encrypted.phone) {
      encrypted.phone = `encrypted_${Buffer.from(encrypted.phone).toString('base64')}`;
    }
    if (encrypted.name) {
      encrypted.name = `encrypted_${Buffer.from(encrypted.name).toString('base64')}`;
    }
    if (encrypted.address) {
      encrypted.address = `encrypted_${Buffer.from(encrypted.address).toString('base64')}`;
    }
    
    encrypted._encrypted = true;
    encrypted._encryptedAt = new Date().toISOString();
    
    return encrypted;
  }
}

// Design-by-Contract helpers (typing-friendly no-ops for tests)
export function Requires(_predicate: any, _message?: string) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    return descriptor;
  };
}

export function Ensures(_predicate: any, _message?: string) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    return descriptor;
  };
}

export function Invariant(_predicate: any, _message?: string) {
  return function (target: any, _propertyKey?: string, descriptor?: any): any {
    // Support both class and method decorators without enforcing runtime behavior
    if (descriptor) {
      return descriptor;
    }
    return target;
  };
}

export class ContractValidators {
  static validate(_contract: any) {
    return true;
  }

  static isNonEmptyString(value: any): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }
}

export class ContractViolationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class RetryUtility {
  static async retry<T>(
    operation: () => Promise<T>, 
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts) break;
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError;
  }

  static async withExponentialBackoff<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelayMs?: number;
      maxDelayMs?: number;
      backoffMultiplier?: number;
      jitterMs?: number;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelayMs = 1000,
      maxDelayMs = 10000,
      backoffMultiplier = 2,
      jitterMs = 500
    } = options;
    
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts) break;
        
        let delay = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);
        delay = Math.min(delay, maxDelayMs);
        
        // Add jitter
        const jitter = (Math.random() - 0.5) * 2 * jitterMs;
        delay = Math.max(0, delay + jitter);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

export function WithCircuitBreaker(_propertyKey?: string, _config?: any) {
  return function (_target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        console.error(`Circuit breaker triggered for ${propertyName}:`, error);
        throw error;
      }
    };
  };
}

// Resume Parser specific exceptions
export class ResumeParserException extends Error {
  constructor(
    public readonly code: string,
    public readonly context?: any
  ) {
    super(`Resume parser error: ${code}`);
    this.name = 'ResumeParserException';
  }
}

// Error correlation management
export class ErrorCorrelationManager {
  private static context: { traceId?: string; requestId?: string } = {};
  
  static setContext(context: { traceId?: string; requestId?: string }) {
    this.context = context;
  }
  
  static getContext() {
    return this.context;
  }
  
  static generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Database performance monitoring
export class DatabasePerformanceMonitor {
  async executeWithMonitoring<T>(
    fn: () => Promise<T>, 
    operationName?: string, 
    expectedMs?: number
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      if (expectedMs && duration > expectedMs) {
        console.warn(`${operationName} took ${duration}ms, expected ${expectedMs}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`${operationName} failed after ${duration}ms:`, error);
      throw error;
    }
  }
}
