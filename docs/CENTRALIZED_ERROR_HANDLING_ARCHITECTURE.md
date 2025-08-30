# Centralized Error Handling Architecture Design

## 🎯 Executive Summary

This document outlines the comprehensive design for standardizing error handling across the AI-Recruitment-Clerk monorepo. The architecture builds upon the existing sophisticated `error-handling.patterns.ts` foundation while addressing service-level inconsistencies and implementing cross-service error correlation.

## 🏗️ Current State Analysis

### Strengths
- **Advanced Foundation**: Sophisticated `AppException` framework with trace IDs, severity levels, and recovery strategies
- **Frontend Excellence**: Angular HTTP interceptor with retry logic, user-friendly messages, and toast notifications  
- **Domain Specificity**: Well-designed Gemini API error classes as exemplar

### Gaps to Address
- **Service Inconsistency**: Most services don't leverage shared error patterns  
- **Missing Domain Errors**: No service-specific error types for each microservice
- **No Cross-Service Correlation**: Missing request correlation across service boundaries
- **Response Format Inconsistency**: Different error response structures across services

## 🏛️ Architecture Design

### 1. Enhanced Shared Error Library Structure

```
libs/shared-error-handling/
├── src/
│   ├── base/                      # Core error infrastructure
│   │   ├── app-exception.ts       # Enhanced AppException (extends existing)
│   │   ├── error-types.ts         # Extended ErrorType enum
│   │   ├── error-context.ts       # Request context and correlation
│   │   └── error-correlation.ts   # Cross-service correlation utilities
│   ├── domain/                    # Service-specific error classes
│   │   ├── resume-parser.errors.ts
│   │   ├── report-generator.errors.ts  
│   │   ├── jd-extractor.errors.ts
│   │   ├── scoring-engine.errors.ts
│   │   ├── app-gateway.errors.ts
│   │   └── database.errors.ts
│   ├── filters/                   # NestJS exception filters
│   │   ├── global-exception.filter.ts
│   │   ├── service-exception.filter.ts
│   │   └── validation-exception.filter.ts
│   ├── interceptors/              # Error interceptors
│   │   ├── error-correlation.interceptor.ts
│   │   └── error-logging.interceptor.ts  
│   ├── logging/                   # Structured logging utilities
│   │   ├── error-logger.ts
│   │   ├── correlation-logger.ts
│   │   └── performance-logger.ts
│   ├── recovery/                  # Error recovery strategies  
│   │   ├── retry-strategies.ts
│   │   ├── circuit-breaker.ts
│   │   └── fallback-handlers.ts
│   ├── formatters/               # Response formatters
│   │   ├── api-error-formatter.ts
│   │   ├── validation-formatter.ts
│   │   └── user-message-formatter.ts
│   ├── testing/                  # Testing utilities
│   │   ├── error-test.utils.ts
│   │   └── mock-error.factory.ts
│   └── index.ts                  # Public API exports
```

### 2. Service-Specific Error Types

#### Resume Parser Service Errors
```typescript
export enum ResumeParserErrorCode {
  FILE_PARSE_FAILED = 'RESUME_PARSE_FAILED',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FILE_FORMAT', 
  FILE_TOO_LARGE = 'FILE_SIZE_EXCEEDED',
  CONTENT_EXTRACTION_FAILED = 'CONTENT_EXTRACTION_FAILED',
  SKILL_DETECTION_FAILED = 'SKILL_DETECTION_FAILED',
  PDF_CORRUPTION = 'PDF_CORRUPTION_DETECTED',
  OCR_PROCESSING_FAILED = 'OCR_PROCESSING_FAILED'
}

export class ResumeParseException extends AppException {
  constructor(code: ResumeParserErrorCode, details?: any, context?: Record<string, any>) {
    super(
      ErrorType.BUSINESS_LOGIC,
      code,
      ResumeParserErrorMessages[code],
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
      context
    );
  }
}
```

#### Report Generator Service Errors
```typescript
export enum ReportGeneratorErrorCode {
  REPORT_GENERATION_FAILED = 'REPORT_GENERATION_FAILED',
  TEMPLATE_NOT_FOUND = 'REPORT_TEMPLATE_NOT_FOUND',
  DATA_AGGREGATION_FAILED = 'DATA_AGGREGATION_FAILED',
  EXPORT_FORMAT_UNSUPPORTED = 'EXPORT_FORMAT_UNSUPPORTED',
  ANALYTICS_COMPUTATION_FAILED = 'ANALYTICS_COMPUTATION_FAILED'
}
```

#### JD Extractor Service Errors  
```typescript
export enum JDExtractorErrorCode {
  JD_PARSE_FAILED = 'JD_PARSING_FAILED',
  REQUIREMENTS_EXTRACTION_FAILED = 'REQUIREMENTS_EXTRACTION_FAILED',
  SKILL_MAPPING_FAILED = 'SKILL_MAPPING_FAILED',
  COMPANY_INFO_EXTRACTION_FAILED = 'COMPANY_INFO_EXTRACTION_FAILED'
}
```

#### Scoring Engine Service Errors
```typescript
export enum ScoringEngineErrorCode {
  SCORING_ALGORITHM_FAILED = 'SCORING_ALGORITHM_FAILED',
  INSUFFICIENT_DATA = 'INSUFFICIENT_MATCHING_DATA',
  WEIGHT_CALCULATION_ERROR = 'SCORING_WEIGHT_ERROR',
  MODEL_PREDICTION_FAILED = 'ML_MODEL_PREDICTION_FAILED'
}
```

### 3. Cross-Service Error Correlation

```typescript
export interface ErrorCorrelationContext {
  requestId: string;           // Unique request identifier
  traceId: string;            // Distributed trace ID
  spanId: string;             // Current service span
  parentSpanId?: string;      // Parent service span
  userId?: string;            // User context
  sessionId?: string;         // Session context
  clientIp?: string;          // Client information
  userAgent?: string;         // User agent
  timestamp: string;          // Error timestamp
  serviceName: string;        // Originating service
  operationName: string;      // Specific operation
}

export class ErrorCorrelationManager {
  static generateRequestId(): string;
  static generateTraceId(): string; 
  static generateSpanId(): string;
  static propagateContext(context: ErrorCorrelationContext): void;
  static getContext(): ErrorCorrelationContext | null;
}
```

### 4. Standardized Global Exception Filter

```typescript
@Catch()
export class StandardizedGlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Get or create correlation context
    const correlationContext = ErrorCorrelationManager.getContext() ?? 
      ErrorCorrelationManager.createContext(request);

    // Convert to standardized AppException  
    const appException = this.convertToAppException(exception, correlationContext);
    
    // Format standardized response
    const errorResponse = StandardizedErrorResponseFormatter.format(appException);
    
    // Log with correlation context
    this.logWithCorrelation(appException, request, correlationContext);
    
    // Send response
    response.status(appException.getStatus()).json(errorResponse);
  }
}
```

### 5. Enhanced Error Response Format

```typescript
export interface StandardizedErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    code: string;
    message: string;
    userMessage: string;        // User-friendly message
    timestamp: string;
    traceId: string;
    requestId: string;
  };
  context: {
    path: string;
    method: string;
    serviceName: string;
  };
  details?: any;                // Development-only details
  suggestions?: string[];       // Recovery suggestions  
}
```

### 6. Structured Logging Integration

```typescript
export class StructuredErrorLogger {
  static logError(
    exception: AppException, 
    context: ErrorCorrelationContext,
    additionalContext?: Record<string, any>
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: this.mapSeverityToLevel(exception.errorDetails.severity),
      message: exception.errorDetails.message,
      error: {
        type: exception.errorDetails.type,
        code: exception.errorDetails.code,
        severity: exception.errorDetails.severity,
        stack: exception.stack
      },
      correlation: context,
      context: additionalContext,
      performance: {
        executionTime: context.executionTime,
        memoryUsage: process.memoryUsage()
      }
    };
    
    // Send to structured logging system
    this.sendToLogger(logEntry);
  }
}
```

## 🔄 Implementation Strategy

### Phase 1: Foundation (High Priority)
1. **Create Enhanced Shared Library**
   - Extend existing `error-handling.patterns.ts`
   - Add service-specific error types
   - Implement correlation management

2. **Standardize Global Exception Filters**  
   - Create standardized filter for all services
   - Implement error correlation
   - Ensure consistent response formats

### Phase 2: Service Integration (Medium Priority)  
3. **Refactor Service Error Handling**
   - Resume-parser-svc: Replace generic exceptions with domain errors
   - Report-generator-svc: Standardize analytics error handling
   - Scoring-engine-svc: Add ML-specific error types
   - JD-extractor-svc: Implement parsing error classification

4. **Update Angular Frontend**
   - Integrate with standardized error responses
   - Enhance correlation display for debugging
   - Add error recovery suggestions

### Phase 3: Advanced Features (Lower Priority)
5. **Error Analytics & Monitoring**
   - Implement error pattern detection
   - Add service health correlation  
   - Create error rate dashboards

6. **Testing & Validation**
   - Create error handling test utilities
   - Add integration tests for error flows
   - Validate consistency across all services

## 🎛️ Migration Strategy

### Automated Migration Tools
```typescript
export class ErrorHandlingMigrationTool {
  // Scan for legacy error patterns
  static scanLegacyErrorHandling(filePath: string): LegacyErrorPattern[];
  
  // Generate migration suggestions  
  static generateMigrationPlan(patterns: LegacyErrorPattern[]): MigrationPlan;
  
  // Apply automated refactoring
  static applyMigration(plan: MigrationPlan): MigrationResult;
}
```

### Backwards Compatibility
- Existing error handling will continue to work during transition
- Gradual migration service by service
- Response format compatibility maintained through formatters

## 📊 Success Metrics

### Technical Metrics
- **Error Response Consistency**: 100% standardized responses across services
- **Error Correlation Coverage**: 95% of errors include full correlation context
- **Service Migration**: 100% services using standardized error handling
- **Logging Standardization**: 100% consistent structured logging

### Operational Metrics  
- **Mean Time to Resolution**: 50% reduction through better error correlation
- **Error Pattern Detection**: Automated identification of recurring issues
- **Developer Experience**: Improved error debugging and testing capabilities
- **User Experience**: Consistent error messages and recovery suggestions

## 🔧 Development Tools

### Error Testing Utilities
```typescript
export class ErrorTestUtils {
  static createMockAppException(type: ErrorType, code: string): AppException;
  static assertErrorResponse(response: any, expectedError: ExpectedError): void;
  static simulateServiceFailure(service: string, errorType: ErrorType): void;
}
```

### Error Simulation Framework
```typescript
export class ErrorSimulator {
  static simulateNetworkFailure(duration: number): void;
  static simulateServiceOverload(service: string): void; 
  static simulateValidationError(fields: string[]): ValidationException;
}
```

## 📚 Documentation Requirements

1. **API Documentation**: Update all service API docs with standardized error responses
2. **Developer Guide**: Error handling best practices and migration guide
3. **Troubleshooting Guide**: Common error scenarios and resolution steps
4. **Testing Guide**: How to test error scenarios and validate handling

---

## 🎯 Next Steps

1. **Review and Approval**: Architecture review with development team
2. **Proof of Concept**: Implement core shared library components  
3. **Pilot Service**: Start with resume-parser-svc as pilot implementation
4. **Iterative Rollout**: Gradual migration across remaining services
5. **Documentation**: Comprehensive documentation and training

This architecture provides a robust, scalable foundation for standardized error handling while building upon the existing sophisticated patterns already developed in the codebase.