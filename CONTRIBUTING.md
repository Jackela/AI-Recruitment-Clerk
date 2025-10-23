# Contributing to AI Recruitment Clerk

Thank you for your interest in contributing to AI Recruitment Clerk! We welcome contributions from the community and are grateful for your support.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Code Review Process](#code-review-process)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## 🚀 Getting Started

### Prerequisites

- Node.js 20.18.0 or higher
- npm 10.0.0 or higher
- Git
- Docker Desktop (for containerized development)
- MongoDB 7.0+ (optional for local development)
- NATS Server 2.10+ (optional for local development)

### Development Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/AI-Recruitment-Clerk.git
   cd AI-Recruitment-Clerk
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/AI-Recruitment-Clerk.git
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Verify setup**
   ```bash
   npm run build
   npm test
   ```

## 🔄 Development Workflow

We follow **Git Flow** branching model:

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features (branch from `develop`)
- `bugfix/*` - Bug fixes (branch from `develop`)
- `hotfix/*` - Critical production fixes (branch from `main`)
- `release/*` - Release preparation (branch from `develop`)

### Creating a Feature Branch

```bash
# Update develop branch
git checkout develop
git pull upstream develop

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, commit, and push
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

### Keeping Your Branch Updated

```bash
# Fetch latest changes
git fetch upstream

# Rebase on develop
git checkout feature/your-feature-name
git rebase upstream/develop

# If conflicts occur, resolve them and continue
git add .
git rebase --continue
```

## 📝 Coding Standards

### TypeScript Guidelines

1. **Strict Mode Required**
   - All TypeScript must compile with `strict: true`
   - No `any` types without explicit justification
   - Use `unknown` for truly unknown types

2. **ESM Modules Only**
   - Use `import`/`export` syntax
   - No CommonJS `require()`/`module.exports`
   - All packages must have `"type": "module"` in package.json

3. **Naming Conventions**
   - Classes: `PascalCase`
   - Interfaces/Types: `PascalCase` with descriptive names
   - Variables/Functions: `camelCase`
   - Constants: `UPPER_SNAKE_CASE`
   - Private properties: prefix with `_` if intentionally unused

4. **File Organization**
   - Source code: `/src` directory
   - Tests: `/tests` or `.spec.ts` files
   - Configuration: `/config` directory
   - Maximum 500 lines per file

### Code Style

```typescript
// ✅ Good - Explicit types, clear naming
export interface UserCredentials {
  email: string;
  password: string;
}

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async authenticate(credentials: UserCredentials): Promise<User> {
    // Implementation
  }
}

// ❌ Bad - Implicit any, unclear naming
export class Service {
  constructor(private repo: any) {}

  async doStuff(data: any): Promise<any> {
    // Implementation
  }
}
```

### Architecture Principles

- **SOLID Principles**: Follow Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **DRY (Don't Repeat Yourself)**: Extract common functionality
- **KISS (Keep It Simple)**: Prefer simple solutions over complex ones
- **Fail-Fast**: Applications must start correctly or fail immediately
- **Event-Driven**: Use NATS for asynchronous communication between services

## 🧪 Testing Requirements

### Test Coverage

- **Minimum**: 90% code coverage for new code
- **Critical Paths**: 100% coverage for authentication, authorization, payment
- **Types**: Unit tests, integration tests, E2E tests

### Writing Tests

```typescript
// Unit test example
describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      save: jest.fn(),
    } as any;
    
    service = new AuthService(mockUserRepository);
  });

  it('should authenticate valid credentials', async () => {
    // Arrange
    const credentials = { email: 'test@example.com', password: 'password123' };
    const mockUser = { id: '1', email: credentials.email };
    mockUserRepository.findByEmail.mockResolvedValue(mockUser);

    // Act
    const result = await service.authenticate(credentials);

    // Assert
    expect(result).toEqual(mockUser);
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(credentials.email);
  });
});
```

## 🧰 Using act Locally (GitHub Actions)

This repo supports validating GitHub Actions locally with `act`.

- Prerequisites:
  - Docker Desktop running
  - act >= 0.2.80 (`act --version`)
  - Node >= 20.18 (matches repo engines)

- Environment quirk:
  - Workflows check `env.ACT`. When set (act sets it automatically), steps that rely on GitHub-hosted services are skipped to avoid errors locally (e.g., artifact upload, CodeQL SARIF upload).

- Common commands:
  - `act -l` — list jobs
  - `act -j quality-check -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-22.04`
  - `act -j build-and-test -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-22.04`
  - `act -j validate-contracts -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-22.04`
  - `act -j coverage -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-22.04`
  - `act -j dependency-scan -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-22.04`

- Expected behavior under act:
  - Artifact uploads are skipped.
  - Codecov uploads log 400 locally without token (non-fatal).
  - CodeQL analyze step is skipped; validate on GitHub for SARIF upload.
  - Secret scanning steps continue-on-error in local runs.

## ✅ Acceptance Scripts

We provide scripts to track acceptance documentation status and generate sign-off reports:

- `npm run acceptance:status` — summarizes checklist status and latest run reports
- `npm run acceptance:signoff` — generates a sign-off report into `specs/001-functional-acceptance/reports/`

See `specs/001-functional-acceptance/` for the acceptance catalog, checklists, and report templates.

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx nx test <project-name>

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 📝 Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build, etc.)
- `ci`: CI/CD changes
- `revert`: Revert previous commit

### Examples

```bash
# Feature
git commit -m "feat(auth): add multi-factor authentication support"

# Bug fix
git commit -m "fix(resume-parser): resolve PDF parsing timeout issue"

# Breaking change
git commit -m "feat(api)!: change authentication endpoint to /v2/auth

BREAKING CHANGE: The /auth endpoint has been moved to /v2/auth"

# With scope and body
git commit -m "refactor(scoring-engine): improve skill matching algorithm

- Add semantic similarity scoring
- Optimize database queries
- Update test cases

Closes #123"
```

### Rules

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- First line should be ≤72 characters
- Reference issues and PRs when applicable
- Add `BREAKING CHANGE:` footer for breaking changes

## 🔍 Pull Request Process

### Before Submitting

1. **Update your branch**
   ```bash
   git fetch upstream
   git rebase upstream/develop
   ```

2. **Run quality checks**
   ```bash
   npm run lint          # Linting check
   npm run typecheck     # TypeScript compilation
   npm test              # Run unit tests
   npm run test:coverage # Generate coverage report
   npm run build         # Build project
   ```
   
   **CI/CD Checks**: All pull requests automatically run:
   - ✅ Quality check (TypeScript + Lint + Security audit)
   - 🧪 Build & Test (Full test suite)
   - 📊 Coverage report (Minimum 70% threshold)
   - 🔒 Security scan (CodeQL + dependency audit + secret scan)
   - 🚀 Semantic release (on merge to main/develop)

3. **Update documentation**
   - Update README.md if needed
   - Add/update JSDoc comments
   - Update CHANGELOG.md

### Submitting PR

1. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**
   - Go to GitHub and click "New Pull Request"
   - Select `develop` as the base branch
   - Fill out the PR template completely
   - Link related issues

3. **PR Checklist** (See full checklist in [PR template](.github/PULL_REQUEST_TEMPLATE.md))
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex logic
   - [ ] Documentation updated
   - [ ] Tests added/updated (target: 90%+ coverage for new code)
   - [ ] All tests passing locally
   - [ ] No new TypeScript warnings
   - [ ] CHANGELOG.md updated (automated via semantic-release)
   - [ ] CI/CD checks pass (all 4 workflows)
   - [ ] No security vulnerabilities introduced

### PR Review Process

1. **Automated Checks** (All must pass)
   - ✅ **Quality Check**: TypeScript compilation + Lint + Security audit
   - 🧪 **Build & Test**: Full test suite execution
   - 📊 **Coverage Report**: Minimum 70% line coverage (target: 90% for new code)
   - 🔒 **Security Scan**: 
     - CodeQL analysis (JavaScript/TypeScript)
     - Dependency vulnerability scan
     - Secret scanning (TruffleHog + GitLeaks)

2. **Code Review** (Required before merge)
   - At least one approval required (auto-assigned via CODEOWNERS)
   - All conversations must be resolved
   - Address all review comments with code changes or explanations
   - Re-request review after updates

3. **Merging** (Automated versioning)
   - **Squash and merge** for feature branches (keeps history clean)
   - **Semantic release** automatically:
     - Analyzes commit messages
     - Determines version bump (major/minor/patch)
     - Generates CHANGELOG.md
     - Creates GitHub Release
     - Adds release tags
   - Delete branch after merge (automated)

## 🐛 Reporting Bugs

### Before Reporting

- Check existing issues to avoid duplicates
- Verify the bug in the latest version
- Collect relevant information

### Bug Report Template

```markdown
**Describe the bug**
A clear and concise description of the bug.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Actual behavior**
What actually happened.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., macOS 14.0]
- Node.js: [e.g., 20.18.0]
- npm: [e.g., 10.0.0]
- Browser: [e.g., Chrome 120]

**Additional context**
Any other relevant information.
```

## 💡 Suggesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features considered.

**Additional context**
Any other context or screenshots.

**Acceptance Criteria**
- [ ] Criterion 1
- [ ] Criterion 2
```

## 👀 Code Review Process

### For Authors

- Respond to all comments
- Ask for clarification if needed
- Update code based on feedback
- Re-request review after changes

### For Reviewers

- Be respectful and constructive
- Focus on code, not the person
- Provide specific, actionable feedback
- Approve when satisfied

### Review Checklist

- [ ] Code meets style guidelines
- [ ] Tests are comprehensive
- [ ] Documentation is clear
- [ ] No security issues
- [ ] Performance is acceptable
- [ ] Error handling is robust

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- CHANGELOG.md for significant contributions
- GitHub Insights and contribution graphs

## 📞 Getting Help

- **Documentation**: Check [docs/](./docs/) directory
- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Search existing issues first
- **Email**: Contact maintainers for private matters

## 🔄 CI/CD Workflows

### Automated Workflows

All pull requests and pushes trigger automated workflows:

#### 1. Quality Check (`.github/workflows/ci.yml`)
- **Triggers**: Push/PR to main/develop
- **Jobs**:
  - TypeScript compilation check
  - Lint verification
  - Security audit (npm audit)
  - Build verification
  - Test suite execution
- **Timeout**: 15 minutes

#### 2. Test Coverage (`.github/workflows/coverage.yml`)
- **Triggers**: Push/PR to main/develop
- **Jobs**:
  - Generate coverage report
  - Upload to Codecov (if configured)
  - Comment PR with coverage summary
  - Fail if coverage <70% (warning only)
- **Artifacts**: Coverage reports (14 days retention)

#### 3. Security Scan (`.github/workflows/security.yml`)
- **Triggers**: Push/PR to main/develop + Weekly schedule (Monday 9 AM UTC)
- **Jobs**:
  - CodeQL analysis (JavaScript + TypeScript)
  - Dependency security scan
  - Secret scanning (TruffleHog + GitLeaks)
  - Generate security summary
- **Artifacts**: Audit reports (30 days retention)

#### 4. Semantic Release (`.github/workflows/release.yml`)
- **Triggers**: Push to main/develop only (not PRs)
- **Actions**:
  - Analyze conventional commits
  - Determine version bump
  - Update CHANGELOG.md
  - Create GitHub Release
  - Add git tags
  - Comment on related issues/PRs
- **Configuration**: `.releaserc.json`

### Workflow Status Badges

Add to your PR description to show CI status:
```markdown
![CI](https://github.com/Jackela/AI-Recruitment-Clerk/workflows/CI/badge.svg)
![Coverage](https://github.com/Jackela/AI-Recruitment-Clerk/workflows/Coverage/badge.svg)
![Security](https://github.com/Jackela/AI-Recruitment-Clerk/workflows/Security/badge.svg)
```

### Troubleshooting CI Failures

**TypeScript Errors**:
```bash
npx tsc --noEmit --project tsconfig.ci.json
```

**Test Failures**:
```bash
npm test -- --verbose
npm run test:coverage
```

**Lint Issues**:
```bash
npm run lint -- --fix
```

**Security Vulnerabilities**:
```bash
npm audit fix
npm audit fix --force  # For breaking changes
```

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to AI Recruitment Clerk!** 🎉

Your contributions help make this project better for everyone.
