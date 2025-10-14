# Gateway Integration Layer - API Documentation

## Overview

Gateway Integration Layer provides unified API endpoints for all domain services implemented in the AI Recruitment Clerk system. This layer serves as the orchestration point between the frontend and the domain logic.

## Architecture

```
Gateway Layer (API Controllers)
    ↓
Integration Services (Business Logic Orchestration)
    ↓
Domain Services (Core Business Logic)
    ↓
Repositories (Data Access)
    ↓
MongoDB / Cache / External Services
```

## Domain Modules

### 1. Analytics Module (`/analytics`)

**Purpose**: User behavior analysis, system performance monitoring, and business metrics collection.

**Key Endpoints**:

- `POST /analytics/events/user-interaction` - Track user interactions
- `POST /analytics/events/system-performance` - Record system performance metrics
- `POST /analytics/metrics` - Record business metrics
- `GET /analytics/sessions/{sessionId}` - Get session analytics
- `GET /analytics/metrics/processing` - Get processing performance metrics
- `GET /analytics/metrics/privacy` - Get privacy compliance metrics
- `POST /analytics/events/batch-process` - Batch process events
- `GET /analytics/reports/retention` - Generate data retention reports

**Features**:

- ✅ Privacy-first design with GDPR compliance
- ✅ Event-driven architecture with domain events
- ✅ Caching for performance optimization
- ✅ Comprehensive validation and error handling
- ✅ Role-based access control
- ✅ Performance monitoring and metrics

### 2. User Management Module (`/users`)

**Purpose**: User profile management and session tracking.

**Key Endpoints**:

- `GET /users/profile` - Get user profile
- `POST /users/preferences` - Update user preferences

**Status**: ⚠️ Simplified implementation (placeholder)

### 3. Questionnaire Module (`/questionnaire`)

**Purpose**: Dynamic questionnaire generation and response collection.

**Key Endpoints**:

- `GET /questionnaire` - Get available questionnaires

**Status**: ⚠️ Simplified implementation (placeholder)

### 4. Usage Limits Module (`/usage-limits`)

**Purpose**: API rate limiting and usage tracking.

**Key Endpoints**:

- `GET /usage-limits` - Get current usage limits

**Status**: ⚠️ Simplified implementation (placeholder)

### 5. Incentive Module (`/incentives`)

**Purpose**: Reward system and incentive management.

**Key Endpoints**:

- `GET /incentives` - Get available incentives

**Status**: ⚠️ Simplified implementation (placeholder)

## Authentication & Authorization

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

Permission-based access control is implemented using decorators:

- `@Permissions(Permission.TRACK_ANALYTICS)` - Analytics tracking
- `@Permissions(Permission.READ_ANALYTICS)` - Analytics reading
- `@Permissions(Permission.MANAGE_PRIVACY)` - Privacy management
- `@Permissions(Permission.GENERATE_REPORTS)` - Report generation

## Data Models

### Analytics Event Structure

```typescript
{
  eventId: string;
  sessionId: string;
  userId?: string;
  eventType: EventType;
  eventCategory: EventCategory;
  status: EventStatus;
  eventData: any;
  context?: any;
  timestamp: Date;
  deviceInfo?: DeviceInfo;
  geoLocation?: GeoLocation;
  consentStatus: ConsentStatus;
  isSystemSession: boolean;
  processedAt?: Date;
  retentionExpiry?: Date;
  isAnonymized: boolean;
}
```

### User Profile Structure

```typescript
{
  userId: string;
  email: string;
  displayName?: string;
  preferences?: UserPreferences;
  dataProcessingConsent: ConsentStatus;
  marketingConsent: ConsentStatus;
  analyticsConsent: ConsentStatus;
  isActive: boolean;
  lastLoginAt?: Date;
  sessionInfo?: SessionInfo;
}
```

## Error Handling

All endpoints return standardized error responses:

```typescript
{
  success: false,
  errors: string[],
  code?: string,
  timestamp: string
}
```

## Performance Features

1. **Caching Strategy**:
   - Session analytics cached for 5 minutes
   - User profiles cached for 30 minutes
   - System metrics cached for 1 minute

2. **Database Optimization**:
   - Compound indexes for frequent query patterns
   - Connection pooling with optimized settings
   - Query optimization for large datasets

3. **Batch Processing**:
   - Event batch processing for improved throughput
   - Bulk operations for data maintenance

## Privacy & Compliance

1. **GDPR Compliance**:
   - Data retention policies with automatic expiry
   - User consent management
   - Data anonymization after retention period
   - Right to be forgotten implementation

2. **Security Features**:
   - Role-based access control
   - Audit logging for all sensitive operations
   - Input validation and sanitization
   - Rate limiting protection

## Monitoring & Observability

1. **Health Checks**:
   - Database connectivity monitoring
   - Cache availability checks
   - External service health validation

2. **Metrics Collection**:
   - Request/response times
   - Error rates by endpoint
   - Database query performance
   - Cache hit/miss ratios

3. **Logging**:
   - Structured logging with correlation IDs
   - Security event logging
   - Performance metrics logging
   - Error tracking and alerting

## Development Setup

1. **Environment Variables**:

```env
MONGODB_URL=mongodb://admin:password123@localhost:27017/ai-recruitment?authSource=admin
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
NODE_ENV=development
```

2. **Running Tests**:

```bash
# Unit tests
npm run test

# Integration tests
npm run test:e2e

# Coverage report
npm run test:cov
```

3. **API Documentation**:

- Swagger UI available at `/api/docs` when running in development
- OpenAPI specification available at `/api/docs-json`

## Future Enhancements

1. **Complete Domain Implementations**:
   - Full Questionnaire module with dynamic form generation
   - Complete User Management with profile customization
   - Usage Limits with real-time tracking
   - Incentive system with reward distribution

2. **Advanced Features**:
   - GraphQL API layer
   - WebSocket support for real-time updates
   - Advanced analytics with ML insights
   - Multi-tenant architecture support

3. **Performance Optimizations**:
   - Redis Streams for event processing
   - Elasticsearch for advanced search
   - CDN integration for static assets
   - Horizontal scaling support

## API Testing Examples

### Track User Interaction

```bash
curl -X POST http://localhost:3000/analytics/events/user-interaction \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_12345",
    "eventType": "user_interaction",
    "eventData": {
      "action": "click",
      "target": "submit_button"
    },
    "context": {
      "pageUrl": "/questionnaire"
    }
  }'
```

### Get Session Analytics

```bash
curl -X GET "http://localhost:3000/analytics/sessions/session_12345?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer <token>"
```

### Generate Privacy Metrics

```bash
curl -X GET "http://localhost:3000/analytics/metrics/privacy?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer <token>"
```
