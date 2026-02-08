# 🤝 Contributing Guidelines

## 📋 Table of Contents
- [Development Philosophy](#development-philosophy)
- [Code Quality Standards](#code-quality-standards)
- [Branching Strategy](#branching-strategy)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Development Workflow](#development-workflow)

## 🎯 Development Philosophy

This project follows **Test-Driven Development (TDD)** and **Documentation First** principles:

1. **🧪 Write tests first**: Every feature starts with failing tests
2. **📚 Document before coding**: API contracts and design decisions precede implementation
3. **🔄 Refactor continuously**: Improve code quality while maintaining functionality
4. **🏗️ Microservices architecture**: Each service has clear boundaries and responsibilities

## 📊 Code Quality Standards

### ✅ Required Standards
- **Test Coverage**: Minimum 90% for all new code
- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Zero warnings/errors before commit
- **Code Review**: All changes require peer review
- **Documentation**: Public APIs must be documented

### 🛠️ Tools Configuration
- **ESLint**: `typescript-eslint@8.29.0` with strict rules
- **Prettier**: Single quotes, consistent formatting
- **Jest**: Unit testing framework
- **Playwright**: E2E testing
- **Nx**: Monorepo management

## 🌿 Branching Strategy (GitFlow-Lite)

### Main Branches
```
main              # Production-ready code
develop           # Integration branch for features
release/*         # Release preparation branches
hotfix/*          # Critical production fixes
```

### Feature Branches
```
feature/task-description     # New features
bugfix/issue-description     # Bug fixes
refactor/improvement-name    # Code improvements
docs/documentation-update    # Documentation updates
```

### Branch Naming Convention
```bash
feature/add-user-authentication
bugfix/fix-resume-parsing-error
refactor/extract-common-logger
docs/update-api-documentation
```

## 🔄 Pull Request Process

### 1. Pre-PR Checklist
- [ ] All tests pass (`npm run test`)
- [ ] Code coverage ≥90%
- [ ] ESLint warnings resolved
- [ ] Documentation updated
- [ ] No merge conflicts

### 2. PR Template
```markdown
## 📋 Description
Brief description of changes and motivation.

## 🧪 Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## 📚 Documentation
- [ ] API documentation updated
- [ ] README updated if needed
- [ ] Breaking changes documented

## 🔍 Review Checklist
- [ ] Code follows project conventions
- [ ] Tests cover edge cases
- [ ] Performance impact considered
- [ ] Security implications reviewed
```

### 3. Review Criteria
- **Functionality**: Does it work as intended?
- **Tests**: Adequate coverage and quality
- **Performance**: No significant regressions
- **Security**: No vulnerabilities introduced
- **Maintainability**: Clean, readable code

### 4. Merge Requirements
- ✅ At least 1 approving review
- ✅ All CI/CD checks pass
- ✅ No merge conflicts
- ✅ Branch up-to-date with target

## 🧪 Testing Requirements

### Test Hierarchy
```
Unit Tests (90%+)     # Individual function/class testing
Integration Tests     # Service interaction testing
E2E Tests            # Full workflow testing
Performance Tests    # Load and stress testing
```

### TDD Workflow
1. **🔴 Red**: Write failing test
2. **🟢 Green**: Implement minimal code to pass
3. **🔵 Refactor**: Improve code quality
4. **📚 Document**: Update documentation

### Test Categories by Service
```typescript
// Unit Tests
describe('ResumeParserService', () => {
  it('should extract personal information from PDF', () => {
    // Test implementation
  });
});

// Integration Tests
describe('Resume Processing Flow', () => {
  it('should complete end-to-end processing', () => {
    // Full workflow test
  });
});
```

## 🔧 Development Workflow

### 1. Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd AI-Recruitment-Clerk

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Configure environment variables in .env.local

# Start development services
docker-compose up -d mongodb nats
```

### 2. Feature Development Process
```bash
# 1. Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 2. Write tests first
# Create test files following TDD approach

# 3. Implement feature
# Write minimal code to pass tests

# 4. Validate changes
npm run test          # Run all tests
npm run lint         # Check code quality
npm run build        # Verify build

# 5. Commit changes
git add .
git commit -m "feat: add user authentication system"

# 6. Push and create PR
git push origin feature/your-feature-name
# Create Pull Request via GitHub/GitLab
```

### 3. Code Style Guidelines

#### TypeScript Standards
```typescript
// ✅ Good
interface UserProfile {
  readonly id: string;
  name: string;
  email: string;
}

class UserService {
  private readonly logger = new Logger(UserService.name);
  
  async createUser(profile: UserProfile): Promise<User> {
    // Implementation
  }
}

// ❌ Bad
class UserService {
  logger: any; // No 'any' types
  
  createUser(profile) { // Missing types
    // Implementation
  }
}
```

#### Naming Conventions
```typescript
// Files: kebab-case
user-authentication.service.ts
resume-parser.controller.ts

// Classes: PascalCase
class ResumeParserService { }
interface UserCredentials { }

// Functions/Variables: camelCase
const parseResumeContent = () => { };
const userProfile = { };

// Constants: SCREAMING_SNAKE_CASE
const MAX_FILE_SIZE = 10485760;
const DEFAULT_TIMEOUT = 30000;
```

### 4. Commit Message Format
```bash
# Format: type(scope): description
feat(auth): add JWT token validation
fix(parser): resolve PDF extraction error
docs(api): update endpoint documentation
refactor(common): extract shared logger utility
test(scoring): add edge case coverage
perf(cache): optimize Redis connection pooling
```

### 5. Service-Specific Guidelines

#### Gateway Service
- Handle HTTP routing and validation
- Manage CORS and security headers
- Validate request payloads
- Handle error responses

#### Microservices
- Single responsibility principle
- Event-driven communication
- Graceful error handling
- Health check endpoints

#### Shared Libraries
- No external dependencies in DTOs
- Comprehensive type definitions
- Backward compatibility considerations

## 🔍 Code Review Guidelines

### What Reviewers Look For
- **Correctness**: Logic and implementation accuracy
- **Performance**: Efficiency and resource usage
- **Security**: Vulnerability prevention
- **Maintainability**: Code clarity and structure
- **Testing**: Coverage and quality
- **Documentation**: Clarity and completeness

### Review Response Expectations
- **Response Time**: Within 24 hours for standard PRs
- **Feedback Quality**: Constructive and specific
- **Resolution**: Address all comments before merge
- **Learning**: Use reviews as learning opportunities

## 🚀 Deployment Considerations

### Pre-Deployment Checklist
- [ ] All tests pass in CI/CD pipeline
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Database migrations tested
- [ ] Rollback plan prepared
- [ ] Monitoring alerts configured

### Production Readiness
- **Logging**: Structured logs with correlation IDs
- **Monitoring**: Health checks and metrics
- **Scalability**: Resource limits and auto-scaling
- **Security**: Authentication and authorization
- **Documentation**: Runbooks and troubleshooting guides

## 📞 Getting Help

### Resources
- **Technical Questions**: Create GitHub issues with `question` label
- **Bug Reports**: Use bug report template
- **Feature Requests**: Use feature request template
- **Architecture Discussions**: Tag team leads in PRs

### Contact Information
- **Maintainers**: Listed in CODEOWNERS file
- **Documentation**: Check `/docs` directory first
- **API Issues**: Reference OpenAPI specifications

---

## 🎯 Success Metrics

We measure contribution success by:
- **Code Quality**: Test coverage and ESLint compliance
- **Delivery Speed**: Time from PR creation to merge
- **System Reliability**: Post-deployment error rates
- **Team Collaboration**: Review feedback quality

**Remember**: We prioritize sustainable development practices over quick fixes. Quality contributions that follow these guidelines help maintain our production-ready status and ensure long-term project success.