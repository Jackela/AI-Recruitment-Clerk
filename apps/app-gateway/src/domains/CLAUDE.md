# Domain Services - API Gateway

This directory contains domain services for the API Gateway. Each domain encapsulates business logic for a specific domain area.

## Domain Organization

### Domain Directories
- `analytics/` - Analytics and reporting domain
- `incentive/` - Incentive and reward system domain
- `questionnaire/` - Questionnaire management domain
- `resume/` - Resume processing domain
- `usage-limit/` - Usage limit and quota domain
- `user-management/` - User management domain

### Domain Service Pattern

Each domain typically contains:
- `*.module.ts` - NestJS module definition with providers/exports
- `*.service.ts` - Domain service with business logic
- `*.repository.ts` - Data access layer (MongoDB operations)
- `*.controller.ts` - REST API endpoints (if applicable)
- `*.spec.ts` - Unit/integration tests

## Service Layering Pattern

### Three-Layer Architecture

```
Controller (optional)
    ↓
Facade Service (UserManagementService)
    ↓
├── CRUD Service (UserCrudService)
└── Auth Service (UserAuthService)
    ↓
Repository (UserRepository)
    ↓
Database (MongoDB)
```

### Layer Responsibilities

1. **Controller** - HTTP request/response handling (optional, not all domains have controllers)
2. **Facade Service** - High-level domain operations, orchestrates CRUD and auth
3. **CRUD Service** - Basic Create, Read, Update, Delete operations
4. **Auth Service** - User-scoped authentication operations
5. **Repository** - Database queries and data persistence

## Service Facading Pattern

### UserManagementService (Facade)

The facade service provides a unified API by delegating to specialized services:

```typescript
@Injectable()
export class UserManagementService {
  constructor(
    private readonly userCrudService: UserCrudService,
    private readonly userAuthService: UserAuthService,
    private readonly userService: UserService,
  ) {}

  // Delegates CRUD operations
  async updateUser(userId: string, data: UpdateUserDto): Promise<UserDto> {
    return this.userCrudService.update(userId, data);
  }

  // Delegates auth operations
  async verifyUserPassword(userId: string, password: string): Promise<boolean> {
    return this.userAuthService.verifyPassword(userId, password);
  }

  // Domain-specific logic (preferences, activity)
  async getUserPreferences(userId: string): Promise<UserPreferencesDto> {
    // Business logic here
  }
}
```

### Benefits of Facade Pattern
- Single entry point for domain operations
- Hides internal complexity from consumers
- Easier to mock in tests
- Clear separation of concerns

## CRUD Service Extraction Pattern

### UserCrudService

Extract basic CRUD operations into a dedicated service:

```typescript
@Injectable()
export class UserCrudService {
  constructor(private readonly userService: UserService) {}

  // Basic CRUD
  async findById(id: string): Promise<UserDto | null> {
    return this.userService.findById(id);
  }

  async findByEmail(email: string): Promise<UserDto | null> {
    return this.userService.findByEmail(email);
  }

  async update(id: string, data: UpdateUserDto): Promise<UserDto> {
    return this.userService.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.userService.delete(id);
  }

  async softDelete(id: string): Promise<void> {
    return this.updateStatus(id, 'inactive');
  }

  // Helper methods
  async exists(id: string): Promise<boolean> {
    return (await this.findById(id)) !== null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    return (await this.findByEmail(email)) !== null;
  }
}
```

### When to Extract a CRUD Service
- Domain has 4+ basic CRUD operations
- Multiple services need similar CRUD access
- Want to reduce duplication across domain services

## Auth Service Separation Pattern

### UserAuthService

Separate authentication concerns from general user management:

```typescript
@Injectable()
export class UserAuthService {
  constructor(private readonly userService: UserService) {}

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) return false;

    // Support both hashed ($2) and plain text (development)
    if (user.password?.startsWith('$2')) {
      return bcrypt.compare(password, user.password);
    }
    return user.password === password;
  }

  async isUserActive(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    return user?.status === 'active';
  }

  async validateAuthentication(userId: string, password: string): Promise<boolean> {
    if (!await this.isUserActive(userId)) {
      return false;
    }
    return this.verifyPassword(userId, password);
  }

  async recordSuccessfulAuth(userId: string): Promise<void> {
    // Update last login, log for audit
  }

  async recordFailedAuth(userId: string, reason: string): Promise<void> {
    // Log failed attempt, trigger lockout if needed
  }
}
```

### Distinction from Global AuthService
- **UserAuthService**: User-scoped operations (verify my password, is my account active)
- **AuthService**: Global operations (login, logout, token validation, session management)

## Module Configuration

### Provider Order Matters

Dependencies must be listed before dependents:

```typescript
@Module({
  providers: [
    UserCrudService,      // No dependencies on other domain services
    UserAuthService,      // May depend on UserCrudService
    UserManagementService, // Depends on UserCrudService and UserAuthService
  ],
  exports: [
    UserCrudService,
    UserAuthService,
    UserManagementService,
  ],
})
export class UserManagementModule {}
```

## Error Handling Patterns

### Domain Service Error Handling

```typescript
import { NotFoundException, BadRequestException } from '@nestjs/common';

async updateUser(userId: string, data: UpdateUserDto): Promise<UserDto> {
  const exists = await this.userCrudService.exists(userId);
  if (!exists) {
    throw new NotFoundException(`User with ID ${userId} not found`);
  }

  try {
    return await this.userCrudService.update(userId, data);
  } catch (error) {
    throw new BadRequestException(`Failed to update user: ${error.message}`);
  }
}
```

### Error Types
- `NotFoundException` - Resource not found (404)
- `BadRequestException` - Invalid input (400)
- `UnauthorizedException` - Not authenticated (401)
- `ForbiddenException` - Not authorized (403)
- `ConflictException` - Resource conflict (409)

## Type Imports

Use `import type` for type-only imports:

```typescript
import type { UserDto, UpdateUserDto } from '@ai-recruitment-clerk/user-management-domain';
import type { UserService } from '../../auth/user.service';
import type { UserCrudService } from './user-crud.service';
```

## Testing Patterns

### Unit Tests
- Mock repository layer
- Test service methods in isolation
- Use Jest's mock functions

```typescript
describe('UserCrudService', () => {
  let service: UserCrudService;
  let userService: jest.Mocked<UserService>;

  beforeEach(() => {
    userService = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<UserService>;
    service = new UserCrudService(userService);
  });
});
```

### Integration Tests
- Test full domain with database
- Use test database
- Clean up after tests

## Common Domain Libraries

Import types from domain libraries:

```typescript
import {
  UserDto,
  UpdateUserDto,
  UserStatus,
} from '@ai-recruitment-clerk/user-management-domain';
```

Available domain libraries:
- `@ai-recruitment-clerk/user-management-domain`
- `@ai-recruitment-clerk/resume-processing-domain`
- `@ai-recruitment-clerk/candidate-scoring-domain`
- `@ai-recruitment-clerk/job-management-domain`
- `@ai-recruitment-clerk/report-generation-domain`
- `@ai-recruitment-clerk/incentive-system-domain`
- `@ai-recruitment-clerk/usage-management-domain`
- `@ai-recruitment-clerk/marketing-domain`
