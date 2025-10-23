# Git Workflow Guide - AI Recruitment Clerk

**Version**: 1.0.0  
**Last Updated**: 2025-01-23  
**Applies To**: All contributors

---

## 📋 Table of Contents

- [Overview](#overview)
- [Branch Strategy](#branch-strategy)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Workflow](#pull-request-workflow)
- [Code Review Process](#code-review-process)
- [Release Process](#release-process)
- [Common Scenarios](#common-scenarios)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

AI Recruitment Clerk follows **Git Flow** branching model with **Conventional Commits** for clear, maintainable version history. This guide ensures consistent collaboration across all contributors.

### Core Principles

- ✅ **Atomic Commits**: One logical change per commit
- ✅ **Meaningful Messages**: Follow Conventional Commits specification
- ✅ **Branch Protection**: `main` and `develop` branches are protected
- ✅ **Pull Request Required**: All changes merge via reviewed PRs
- ✅ **CI Must Pass**: All quality checks must succeed before merge

---

## 🌿 Branch Strategy

### Branch Types

```
main (protected)
├── develop (protected, default branch)
│   ├── feature/user-authentication
│   ├── feature/resume-batch-upload
│   ├── bugfix/pdf-parsing-timeout
│   └── refactor/scoring-engine-optimization
├── hotfix/critical-security-patch
└── release/v1.1.0
```

### Branch Naming Convention

| Type | Pattern | Example | Purpose |
|------|---------|---------|---------|
| **Feature** | `feature/<description>` | `feature/multi-language-support` | New functionality |
| **Bugfix** | `bugfix/<description>` | `bugfix/resume-upload-validation` | Bug fixes |
| **Hotfix** | `hotfix/<description>` | `hotfix/security-jwt-expiration` | Critical production fixes |
| **Refactor** | `refactor/<description>` | `refactor/nats-client-retry-logic` | Code improvements |
| **Docs** | `docs/<description>` | `docs/api-endpoint-documentation` | Documentation only |
| **Test** | `test/<description>` | `test/e2e-job-creation-workflow` | Testing additions |
| **Release** | `release/v<version>` | `release/v1.2.0` | Release preparation |

### Branch Descriptions

Use **lowercase** with **hyphens** (kebab-case), not underscores or spaces.

```bash
# ✅ Good
feature/semantic-cache-optimization
bugfix/mongodb-connection-timeout

# ❌ Bad
Feature/Semantic_Cache_Optimization
bugfix-mongodb-timeout
fix_bug
```

---

## 📝 Commit Message Guidelines

### Conventional Commits Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Use Case | Example |
|------|----------|---------|
| **feat** | New feature | `feat(resume-parser): add multi-page PDF support` |
| **fix** | Bug fix | `fix(scoring-engine): resolve null reference error` |
| **refactor** | Code refactoring | `refactor(auth): simplify JWT validation logic` |
| **perf** | Performance improvement | `perf(jd-extractor): optimize LLM API retry logic` |
| **docs** | Documentation | `docs(readme): update installation instructions` |
| **style** | Code style (formatting) | `style(frontend): apply prettier formatting` |
| **test** | Testing | `test(resume-parser): add unit tests for PDF validation` |
| **chore** | Maintenance | `chore(deps): update NestJS to v11.1.0` |
| **ci** | CI/CD changes | `ci(github-actions): add test coverage reporting` |
| **revert** | Revert commit | `revert: feat(semantic-cache): revert cache implementation` |

### Scopes (Optional but Recommended)

- **Services**: `resume-parser`, `jd-extractor`, `scoring-engine`, `report-generator`, `app-gateway`
- **Frontend**: `ui`, `dashboard`, `jobs`, `candidates`, `reports`
- **Infrastructure**: `docker`, `nats`, `mongodb`, `redis`, `railway`
- **Libraries**: `shared-dtos`, `infrastructure-shared`, `ai-services-shared`
- **Testing**: `e2e`, `unit`, `integration`

### Examples

#### Good Commit Messages

```bash
# Feature with scope
feat(resume-parser): implement semantic cache for duplicate JD analysis

# Bug fix with body
fix(jd-extractor): resolve LLM timeout on large job descriptions

- Increase timeout from 30s to 60s
- Add exponential backoff retry logic
- Log detailed error context

Closes #123

# Breaking change
feat(api)!: migrate authentication endpoint to /v2/auth

BREAKING CHANGE: The /auth endpoint has been moved to /v2/auth.
Update all API clients to use the new endpoint.

# Chore with dependencies
chore(deps): upgrade TypeScript to 5.8.0 and related types

# Performance improvement
perf(scoring-engine): optimize skill matching with vectorized comparison

- Replace nested loops with vector operations
- Add caching for frequently matched skills
- Reduce average matching time from 500ms to 50ms

Closes #456
```

#### Bad Commit Messages

```bash
# ❌ Too vague
fix: bug fix
update code
changes

# ❌ Not following convention
Fixed the resume parser bug
Added new feature
Updated files

# ❌ Missing meaningful description
feat: update
fix: changes
refactor: refactor code
```

### Commit Message Rules

1. **First line (subject)**:
   - ≤72 characters
   - Lowercase (except proper nouns)
   - No period at end
   - Imperative mood ("add feature" not "added feature")

2. **Body** (optional):
   - Separate from subject with blank line
   - Explain **what** and **why**, not **how**
   - Wrap at 72 characters

3. **Footer** (optional):
   - Reference issues: `Closes #123`, `Fixes #456`, `Relates to #789`
   - Breaking changes: `BREAKING CHANGE: description`

---

## 🔄 Pull Request Workflow

### 1. Create Feature Branch

```bash
# Update develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/semantic-cache-optimization

# Make changes and commit
git add .
git commit -m "feat(jd-extractor): add semantic cache for duplicate JD detection"

# Push to remote
git push origin feature/semantic-cache-optimization
```

### 2. Keep Branch Updated

```bash
# Fetch latest changes
git fetch origin

# Rebase on develop (preferred method)
git checkout feature/semantic-cache-optimization
git rebase origin/develop

# Resolve conflicts if any
git add <resolved-files>
git rebase --continue

# Force push (rebase rewrites history)
git push origin feature/semantic-cache-optimization --force-with-lease
```

### 3. Create Pull Request

**On GitHub**:
1. Click "New Pull Request"
2. Base: `develop` ← Compare: `feature/your-branch`
3. Fill out PR template completely
4. Link related issues
5. Request reviewers (auto-assigned via CODEOWNERS)

**PR Title Format**:
```
<type>(<scope>): <description>

Example:
feat(jd-extractor): add semantic cache for duplicate JD detection
```

### 4. Address Review Feedback

```bash
# Make requested changes
git add .
git commit -m "refactor(jd-extractor): simplify cache key generation logic"

# Push updates
git push origin feature/semantic-cache-optimization
```

### 5. Merge Pull Request

**Merge Strategy**: Squash and Merge (default)

- Combines all commits into one
- Keeps `develop` history clean
- Preserves full history in feature branch

**After Merge**:
```bash
# Delete local branch
git checkout develop
git pull origin develop
git branch -d feature/semantic-cache-optimization

# Delete remote branch (if not auto-deleted)
git push origin --delete feature/semantic-cache-optimization
```

---

## 👀 Code Review Process

### For Authors

**Before Requesting Review**:
- [ ] All tests passing locally
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (if applicable)

**During Review**:
- Respond to all comments
- Ask for clarification if unclear
- Update code based on feedback
- Re-request review after changes

### For Reviewers

**Review Checklist**:
- [ ] Code meets style guidelines
- [ ] Tests are comprehensive
- [ ] No security vulnerabilities
- [ ] Performance is acceptable
- [ ] Documentation is clear
- [ ] Breaking changes are justified

**Review Etiquette**:
- Be respectful and constructive
- Focus on code, not person
- Provide specific, actionable feedback
- Approve when satisfied

---

## 🚀 Release Process

### Semantic Versioning

```
MAJOR.MINOR.PATCH (e.g., 1.2.3)

MAJOR: Breaking changes
MINOR: New features (backward compatible)
PATCH: Bug fixes (backward compatible)
```

### Release Workflow

```bash
# 1. Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# 2. Update version in package.json
npm version minor  # or major, patch

# 3. Update CHANGELOG.md
# Add release notes, breaking changes, migration guide

# 4. Commit version bump
git commit -am "chore(release): prepare v1.2.0 release"

# 5. Push release branch
git push origin release/v1.2.0

# 6. Create PR: release/v1.2.0 → main
# 7. After merge to main, tag the release
git checkout main
git pull origin main
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0

# 8. Merge main → develop
git checkout develop
git merge main
git push origin develop

# 9. Create GitHub Release with changelog
```

### Hotfix Workflow

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-patch

# 2. Fix the issue
git commit -m "fix(auth): patch JWT expiration vulnerability"

# 3. Bump patch version
npm version patch

# 4. Push hotfix
git push origin hotfix/critical-security-patch

# 5. Create PR: hotfix → main
# 6. After merge, tag the release
git checkout main
git pull origin main
git tag -a v1.1.1 -m "Hotfix v1.1.1"
git push origin v1.1.1

# 7. Merge main → develop
git checkout develop
git merge main
git push origin develop
```

---

## 🔧 Common Scenarios

### Scenario 1: Update Feature Branch with Latest Develop

```bash
git checkout feature/your-feature
git fetch origin
git rebase origin/develop

# If conflicts
git status  # Check conflicting files
# Edit files to resolve conflicts
git add <resolved-files>
git rebase --continue

git push origin feature/your-feature --force-with-lease
```

### Scenario 2: Fix Commit Message Typo

```bash
# Last commit only
git commit --amend -m "feat(service): correct commit message"
git push origin feature/your-feature --force-with-lease

# Multiple commits (interactive rebase)
git rebase -i HEAD~3
# Mark commits with 'reword' in editor
# Update commit messages
git push origin feature/your-feature --force-with-lease
```

### Scenario 3: Split Large PR into Smaller Ones

```bash
# Create multiple feature branches
git checkout develop
git checkout -b feature/part-1
# Cherry-pick relevant commits
git cherry-pick <commit-hash>
git push origin feature/part-1

git checkout develop
git checkout -b feature/part-2
# Cherry-pick other commits
git cherry-pick <commit-hash>
git push origin feature/part-2
```

### Scenario 4: Undo Last Commit (Not Pushed)

```bash
# Keep changes staged
git reset --soft HEAD~1

# Keep changes unstaged
git reset HEAD~1

# Discard changes completely (DANGEROUS)
git reset --hard HEAD~1
```

### Scenario 5: Sync Forked Repository

```bash
# Add upstream remote (one-time)
git remote add upstream https://github.com/ORIGINAL_OWNER/AI-Recruitment-Clerk.git

# Fetch upstream changes
git fetch upstream

# Update develop branch
git checkout develop
git merge upstream/develop
git push origin develop

# Update main branch
git checkout main
git merge upstream/main
git push origin main
```

---

## 🐛 Troubleshooting

### Problem: Merge Conflicts During Rebase

```bash
# 1. Check conflicting files
git status

# 2. Edit files to resolve conflicts
# Look for conflict markers: <<<<<<<, =======, >>>>>>>

# 3. Stage resolved files
git add <resolved-file>

# 4. Continue rebase
git rebase --continue

# 5. If too complex, abort and merge instead
git rebase --abort
git merge origin/develop
```

### Problem: Accidentally Committed to Wrong Branch

```bash
# Move commit to correct branch (not yet pushed)
git log  # Copy commit hash
git checkout correct-branch
git cherry-pick <commit-hash>
git checkout wrong-branch
git reset --hard HEAD~1
```

### Problem: Need to Update PR After Force Push

```bash
# Fetch latest changes
git fetch origin

# Reset local branch to remote
git checkout feature/your-feature
git reset --hard origin/feature/your-feature
```

### Problem: Accidentally Pushed to Protected Branch

**Contact maintainers immediately**. Protected branches prevent direct pushes, but if it happens:

1. Do NOT force push
2. Create revert PR
3. Follow hotfix workflow if critical

---

## 📚 Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

---

## 🤝 Getting Help

- **Questions**: Open a [GitHub Discussion](https://github.com/Jackela/AI-Recruitment-Clerk/discussions)
- **Issues**: Check [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Urgent**: Contact @Jackela

---

**Last Updated**: 2025-01-23  
**Maintained By**: @Jackela  
**Version**: 1.0.0
