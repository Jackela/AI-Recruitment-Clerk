# Manual Git Rebase Directive for AI Developer Agent

## 🎯 Objective

**Mission**: Clean up the project's Git commit history by squashing approximately 25-30 recent commits into exactly 4 logical commits that follow Conventional Commits specification.

**Critical Success Criteria**: 
- Preserve all code changes and functionality
- Create clean, logical commit history
- Maintain chronological order of development phases
- Follow Conventional Commits specification exactly

---

## ⚠️ CRITICAL PREREQUISITES

### 1. Safety Backup Creation

**MANDATORY**: Before beginning any rebase operation, create a complete backup branch:

```bash
# Create backup branch from current state
git branch backup-before-rebase-$(date +%Y%m%d-%H%M%S)

# Verify backup was created
git branch -v | grep backup
```

**Validation**: Ensure backup branch shows in the output with current commit hash.

### 2. Working Directory Assessment

**Current State Analysis Required**:

The working directory contains **significant uncommitted changes** that represent completed development work:

- **58 modified files** including E2E test infrastructure improvements
- **31 untracked files** including new selectors, tests, and documentation
- **Recent commits span approximately 25-30 commits** requiring consolidation

**MANDATORY ACTION**: All uncommitted changes MUST be committed before starting the rebase:

```bash
# Stage all changes for commit
git add .

# Create a comprehensive commit with all current work
git commit -m "WIP: Complete current development session

- Implement NgRx selectors and comprehensive unit tests
- Resolve all E2E test failures including WebKit compatibility
- Decompose oversized components and improve code structure
- Add comprehensive E2E testing infrastructure and monitoring
- Fix production build issues and bundle optimization
- Complete frontend refactoring and accessibility improvements

This commit captures all work completed in the current session
before performing interactive rebase to clean up commit history."
```

**Verification**: `git status` should show "working tree clean" before proceeding.

---

## 📋 REBASE TARGET STRUCTURE

### Target Commit History (Newest to Oldest)

The interactive rebase must create exactly these 4 commits in this order:

#### 1. **fix(e2e): Resolve all E2E test failures and infrastructure issues**
**Scope**: Complete E2E testing infrastructure overhaul
- WebKit compatibility issues resolution (100% test success rate)
- Firefox connection stability improvements  
- Cross-browser testing infrastructure
- Performance monitoring and diagnostic tools
- Test automation and reliability improvements

#### 2. **refactor(frontend): Decompose oversized components and cleanup code**
**Scope**: Frontend architecture improvements and code quality
- Component decomposition and modularization
- Code cleanup and standardization
- Accessibility improvements and ARIA compliance
- Mobile component optimizations
- UI/UX enhancements and responsive design

#### 3. **refactor(state): Implement NgRx selectors and unit tests**
**Scope**: State management architecture improvements
- NgRx selectors implementation for jobs, reports, resumes
- Comprehensive unit test coverage for selectors
- State management pattern standardization
- Performance optimizations for state queries

#### 4. **feat(core): Harden infrastructure and fix production build**
**Scope**: Infrastructure and deployment improvements
- Production build optimization and bundle management
- CI/CD pipeline hardening and reliability
- Railway deployment configuration improvements
- Build system optimization and dependency management
- Health check and monitoring implementations

---

## 🔧 INTERACTIVE REBASE EXECUTION

### Step 1: Identify Rebase Range

**Determine the commit range** by finding the last commit before the development work began:

```bash
# Find the commit that should remain unchanged (base commit)
git log --oneline -40 | grep -E "(Merge pull request|Initial|Setup)"

# Expected result should show a commit like "24d5446 Merge pull request #18"
# This represents the stable base before recent development work
```

**Select Base Commit**: Use the commit hash from the merge or initial setup commit (approximately `24d5446` based on current history).

### Step 2: Initiate Interactive Rebase

```bash
# Start interactive rebase from the base commit
# Replace XXXXXXX with the actual base commit hash identified in Step 1
git rebase -i 24d5446

# Alternative: Count commits from HEAD if base is unclear
# git rebase -i HEAD~30
```

**Expected Result**: This opens an interactive editor showing approximately 25-30 commits.

### Step 3: Rebase Plan Configuration

**In the interactive rebase editor**, configure the commits as follows:

```
# Rebase Instructions Template
# 
# Commands:
# p, pick <commit> = use commit
# r, reword <commit> = use commit, but edit the commit message
# e, edit <commit> = use commit, but stop for amending
# s, squash <commit> = use commit, but squash into previous commit
# f, fixup <commit> = like "squash", but discard this commit's log message
# x, exec <command> = run command (the rest of the line) using shell
# b, break = stop here (continue rebase later with 'git rebase --continue')
# d, drop <commit> = remove commit
# l, label <label> = label current HEAD with a name
# t, reset <label> = reset HEAD to a label
# m, merge [-C <commit> | -c <commit>] <label> [# <oneline>]

# TARGET STRUCTURE (apply this configuration):

# === GROUP 1: Infrastructure and Production (OLDEST) ===
pick c643766  # Fix: Railway deployment config - nixpacks + port mapping + build command
squash a87cac7 # Fix: Build and start scripts - ensure dependencies and frontend build  
squash 744fd8f # Wave 3: Fix ES Module conflict - separate backend/frontend builds
squash 92ded3f # Wave 3B: Emergency fix - revert webpack externals, improve build fallback
squash c8f2093 # CICD
squash f452d31 # CICD
squash 9239cee # fix: add missing package-lock.json for CI/CD
squash 026fae2 # fix: resolve CI/CD workflow failures
squash 1a9bee4 # 🌊 Wave 7: Complete infrastructure fix for Railway production
squash 69698a7 # fix: nixpacks build configuration for Railway deployment
squash b49c7b3 # Fix Railway deployment - optimize build command and add ignore file
squash fa2da85 # fix: streamline CI/CD pipeline and resolve core issues

# === GROUP 2: State Management (SECOND) ===
pick 7334392  # First commit with state management work
squash 184d26d # Additional state management improvements
# (State management commits will be identified during rebase)

# === GROUP 3: Frontend Refactoring (THIRD) ===  
pick 92f52c0  # Refractor
squash aee204f # Update
squash a79f505 # REfractor
squash 7d71962 # FrontEnd Refractor
squash 18c774d # Wave 4A: Hybrid Architecture - NestJS backend + Enhanced frontend integration
squash 51f50b9 # Wave 3E: Force enhanced server via nixpacks direct start
squash 5397e23 # Wave 3D: Test enhanced server directly - bypass NestJS build temporarily
squash b4baba6 # Wave 3C: Add enhanced server fallback with full AI recruitment interface

# === GROUP 4: E2E Testing (NEWEST) ===
pick [CURRENT] # WIP: Complete current development session (the commit we just created)
# This contains all the E2E work and will become the E2E testing commit

```

### Step 4: Commit Message Configuration

**For each "pick" commit** (the first commit in each group), the rebase will prompt for commit messages. Use EXACTLY these messages:

#### Message 1 (Infrastructure - OLDEST):
```
feat(core): Harden infrastructure and fix production build

- Optimize Railway deployment configuration with nixpacks
- Fix CI/CD pipeline reliability and dependency management  
- Resolve ES Module conflicts in build system
- Implement robust health checks and monitoring
- Harden build scripts and deployment automation
- Fix production bundle optimization and asset management

This commit consolidates all infrastructure improvements including
deployment configuration, build system optimization, and production
environment hardening for reliable cloud deployment.
```

#### Message 2 (State Management):
```
refactor(state): Implement NgRx selectors and unit tests

- Add comprehensive NgRx selectors for jobs, reports, and resumes
- Implement full unit test coverage for all selectors
- Standardize state management patterns across application  
- Optimize state queries and data access performance
- Add type safety and error handling for state operations
- Implement selector memoization for performance optimization

This commit establishes robust state management architecture with
comprehensive testing and performance optimizations for scalable
data handling across the application.
```

#### Message 3 (Frontend Refactoring):
```
refactor(frontend): Decompose oversized components and cleanup code

- Decompose large components into smaller, focused modules
- Implement comprehensive accessibility improvements and ARIA compliance
- Optimize mobile components for responsive design
- Standardize component architecture and patterns
- Improve code quality through cleanup and refactoring
- Enhance UI/UX consistency across application

This commit improves frontend architecture through systematic
component decomposition, accessibility enhancements, and code
quality improvements for maintainable and scalable UI development.
```

#### Message 4 (E2E Testing - NEWEST):
```
fix(e2e): Resolve all E2E test failures and infrastructure issues

- Fix WebKit compatibility achieving 100% cross-browser test success
- Implement comprehensive E2E testing infrastructure and monitoring
- Resolve Firefox connection stability and reliability issues
- Add performance benchmarking and diagnostic capabilities
- Create automated test runners and CI/CD integration
- Implement browser-specific configurations and fallback strategies

This commit resolves all E2E testing failures and establishes robust
cross-browser testing infrastructure for reliable automated testing
across Chromium, Firefox, and WebKit browsers.
```

---

## 🚨 ERROR HANDLING AND RECOVERY

### Conflict Resolution

**When merge conflicts occur during rebase**:

1. **Identify conflict files**:
```bash
git status
# Look for files marked as "both modified"
```

2. **Resolve conflicts manually**:
   - Open each conflicted file
   - Remove conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
   - Choose the correct content (usually keep both sets of changes)
   - Save the file

3. **Continue rebase**:
```bash
git add .
git rebase --continue
```

### Rebase Abortion and Recovery

**If rebase becomes problematic**:

```bash
# Abort current rebase and return to original state
git rebase --abort

# Restore from backup if needed
git checkout backup-before-rebase-[timestamp]
git checkout -b retry-rebase-attempt
```

### Common Error Scenarios

#### 1. **Empty Commit Error**
```
error: cannot squash without a previous commit
```
**Solution**: Ensure the first commit in each group uses `pick`, not `squash`.

#### 2. **Editor Configuration Issues**
```bash
# If rebase editor doesn't open properly
git config core.editor "code --wait"  # For VS Code
# OR
git config core.editor "nano"         # For nano
```

#### 3. **Commit Message Rejection**
**Issue**: Long commit messages may be rejected
**Solution**: Keep first line under 72 characters, use blank line before detailed description.

---

## ✅ POST-REBASE VALIDATION

### 1. Verify Commit History

```bash
# Check that exactly 4 commits exist from base
git log --oneline -10

# Expected output should show 4 commits with exact conventional commit messages
```

### 2. Validate Working Directory

```bash
# Ensure working directory is clean
git status

# Should show: "nothing to commit, working tree clean"
```

### 3. Functional Testing

```bash
# Verify build still works
npm run build

# Verify tests still pass  
npm run test

# Verify application still functions
npm run dev
```

### 4. Commit Message Compliance Check

**Verify each commit message follows Conventional Commits**:
- Format: `type(scope): description`
- Types used: `feat`, `refactor`, `fix`
- Scopes used: `core`, `state`, `frontend`, `e2e`
- Description starts with lowercase verb

---

## 🔄 FORCE PUSH CONSIDERATIONS

**CRITICAL**: After successful rebase, the Git history has been rewritten.

### Local Repository Confirmation

```bash
# Confirm local history is correct
git log --oneline -5

# Should show exactly 4 commits with conventional commit messages
```

### Remote Push Strategy

**⚠️ WARNING**: Force push will overwrite remote history

```bash
# Safe force push (recommended)
git push --force-with-lease origin main

# Only use regular force push if force-with-lease fails
git push --force origin main
```

**Validation**: After push, verify remote repository shows clean history with 4 commits.

---

## 📊 SUCCESS CRITERIA CHECKLIST

### ✅ Mandatory Validation Points

- [ ] **Backup Created**: Backup branch exists with original history
- [ ] **Working Directory Clean**: `git status` shows no uncommitted changes
- [ ] **Exact Commit Count**: History shows exactly 4 commits from base
- [ ] **Conventional Commits**: All 4 messages follow specification exactly
- [ ] **Functional Integrity**: Application builds, tests pass, runs correctly
- [ ] **Chronological Order**: Commits are ordered from infrastructure → state → frontend → e2e
- [ ] **Remote Sync**: Force push completed successfully without conflicts

### 🎯 Quality Assurance

- [ ] **Message Accuracy**: Each commit message matches provided template exactly
- [ ] **Scope Correctness**: Infrastructure, state management, frontend, and E2E work properly grouped
- [ ] **No Lost Changes**: All development work from original 25-30 commits preserved
- [ ] **Build System**: Production builds work without errors
- [ ] **Test Suite**: All tests continue to pass after rebase

---

## 🔧 EMERGENCY RECOVERY PROCEDURES

### Complete Recovery from Backup

**If rebase fails catastrophically**:

```bash
# Return to backup
git checkout backup-before-rebase-[timestamp]

# Create new working branch
git checkout -b recovery-attempt

# Re-approach rebase with smaller chunks if necessary
```

### Partial Recovery Strategy

**If some commits are successfully rebased**:

```bash
# Note current position
git log --oneline -10

# Return to backup
git checkout backup-before-rebase-[timestamp]

# Cherry-pick successfully rebased commits
git cherry-pick [commit-hash-1] [commit-hash-2]
```

---

## 📝 EXECUTION SUMMARY

This directive provides comprehensive instructions for consolidating approximately 25-30 commits into 4 logical, conventional commits. The rebase operation requires careful attention to:

1. **Proper grouping** of related changes into logical commits
2. **Exact conventional commit message formatting** as specified
3. **Preservation of all development work** without data loss
4. **Functional validation** ensuring application integrity
5. **Safe backup and recovery procedures** for error scenarios

**Expected Duration**: 30-60 minutes for careful execution
**Risk Level**: Medium (mitigated by comprehensive backup strategy)
**Success Rate**: High when following all procedures exactly

The completed rebase will result in a clean, professional Git history that clearly communicates the development phases and maintains full conventional commit compliance for automated tooling and semantic versioning systems.