# Branch Protection Setup Guide

**Project**: AI Recruitment Clerk  
**Purpose**: Configure branch protection rules on GitHub  
**Target Branches**: `main`, `develop`  
**Version**: 1.0.0

---

## 📋 Overview

Branch protection prevents accidental pushes, enforces code review, and ensures quality gates pass before merging. This guide provides step-by-step instructions for setting up branch protection rules.

---

## 🎯 Protection Goals

- ✅ Prevent direct pushes to `main` and `develop`
- ✅ Require pull request reviews before merging
- ✅ Enforce CI/CD checks pass before merge
- ✅ Require branches to be up-to-date
- ✅ Prevent force pushes and deletions
- ✅ Require status checks to pass

---

## 🔧 Setup Instructions

### Prerequisites

- Repository admin access
- GitHub account with appropriate permissions
- Repository must have CI/CD workflows configured

### Step 1: Navigate to Branch Protection Settings

1. Go to your GitHub repository
2. Click **Settings** (top navigation)
3. In left sidebar, click **Branches** (under "Code and automation")

### Step 2: Add Branch Protection Rule for `main`

1. Click **Add branch protection rule**
2. Enter branch name pattern: `main`

### Step 3: Configure Protection Rules for `main`

**Required Settings**:

#### ✅ Pull Request Requirements
```
☑ Require a pull request before merging
  ☑ Require approvals: 1
  ☑ Dismiss stale pull request approvals when new commits are pushed
  ☐ Require review from Code Owners (optional for single-person projects)
  ☑ Restrict who can dismiss pull request reviews
  ☑ Allow specified actors to bypass required pull requests (only for admins in emergencies)
```

#### ✅ Status Checks
```
☑ Require status checks to pass before merging
  ☑ Require branches to be up to date before merging
  
  Select status checks (add after first CI run):
  ☑ quality-check (TypeScript, Lint)
  ☑ test-suite (Unit tests)
  ☑ build-check (Build verification)
```

#### ✅ Commit Requirements
```
☑ Require conversation resolution before merging
☑ Require signed commits (optional but recommended)
☐ Require linear history (optional - prevents merge commits)
☐ Require deployments to succeed before merging (if using GitHub Deployments)
```

#### ✅ Additional Restrictions
```
☑ Lock branch (for emergency read-only mode)
☑ Do not allow bypassing the above settings
☐ Restrict who can push to matching branches (optional)
```

#### ✅ Force Push & Deletion Protection
```
☐ Allow force pushes (KEEP UNCHECKED for main)
  ☐ Everyone
  ☐ Specify who can force push

☐ Allow deletions (KEEP UNCHECKED for main)
```

### Step 4: Save Protection Rule

1. Scroll to bottom
2. Click **Create** button
3. Confirm rule is listed

### Step 5: Add Branch Protection Rule for `develop`

Repeat Steps 2-4 with these modifications:

**Branch name pattern**: `develop`

**Modified Settings**:
```
☑ Require a pull request before merging
  ☑ Require approvals: 1 (can be 0 for faster development)
  ☑ Dismiss stale pull request approvals when new commits are pushed
  
☑ Require status checks to pass before merging
  ☑ Require branches to be up to date before merging
  
  Select status checks:
  ☑ quality-check
  ☑ test-suite
  ☑ build-check

☑ Require conversation resolution before merging

☐ Allow force pushes (KEEP UNCHECKED)
☐ Allow deletions (KEEP UNCHECKED)
```

---

## 📊 Recommended Configuration Matrix

| Setting | `main` | `develop` | Reasoning |
|---------|--------|-----------|-----------|
| **Require PR** | ✅ | ✅ | Enforce code review |
| **Approvals Required** | 1+ | 1 | Quality gate |
| **Dismiss Stale Reviews** | ✅ | ✅ | Ensure latest code reviewed |
| **Status Checks** | ✅ | ✅ | CI must pass |
| **Up-to-date Branch** | ✅ | ✅ | Prevent merge conflicts |
| **Conversation Resolution** | ✅ | ✅ | All comments addressed |
| **Signed Commits** | ✅ | ⚠️ Optional | Security best practice |
| **Linear History** | ⚠️ Optional | ❌ | Cleaner history (optional) |
| **Allow Force Push** | ❌ | ❌ | Prevent history rewriting |
| **Allow Deletion** | ❌ | ❌ | Prevent accidental deletion |

---

## 🚨 Status Checks Configuration

### Initial Setup (Before First CI Run)

You **cannot** add status checks until they've run at least once. Therefore:

1. Create branch protection rule **without** status checks
2. Run CI/CD workflow on a test PR
3. Return to branch protection settings
4. Edit rule to add status checks

### Required Status Checks

After CI runs successfully, add these checks:

```yaml
# From .github/workflows/ci.yml
✅ quality-check          # TypeScript + Lint
✅ test-suite            # Unit tests
✅ build-check           # Build verification
✅ e2e-tests (optional)  # End-to-end tests
✅ security-scan (if enabled)  # CodeQL security analysis
```

### How to Add Status Checks

1. Go to branch protection rule
2. Click **Edit** button
3. Scroll to "Require status checks to pass before merging"
4. Search for check names (e.g., "quality-check")
5. Click to select each check
6. Save changes

---

## 🔐 Advanced Configurations

### For Team Repositories

```
☑ Require review from Code Owners
  - Automatically requests reviews from CODEOWNERS
  
☑ Restrict who can push to matching branches
  - Select: admins, maintainers
  - Prevents junior devs from bypassing PR process
  
☑ Restrict who can dismiss pull request reviews
  - Select: admins only
  - Prevents self-approval bypass
```

### For Open Source Projects

```
☑ Require approval from someone with write access
  - External contributors cannot self-merge
  
☑ Require status checks to pass before merging
  - Ensures all forks pass CI
  
☑ Restrict who can push to matching branches
  - Maintainers only
```

### For Enterprise Projects

```
☑ Require signed commits
  - Verify commit authenticity
  
☑ Require deployments to succeed before merging
  - Ensure staging deployment works
  
☑ Lock branch (emergency use)
  - Temporarily freeze all changes
```

---

## 🧪 Testing Branch Protection

### Test Checklist

#### Test 1: Direct Push Prevention
```bash
git checkout main
echo "test" > test.txt
git add test.txt
git commit -m "test: direct push"
git push origin main
```
**Expected**: ❌ Push rejected

#### Test 2: PR Without Approval
1. Create feature branch
2. Make changes and push
3. Create PR
4. Try to merge without approval

**Expected**: ❌ Merge button disabled

#### Test 3: PR Without CI Passing
1. Create PR with failing tests
2. Try to merge

**Expected**: ❌ Merge blocked by status checks

#### Test 4: PR With Approval and Passing CI
1. Create PR
2. Get approval
3. CI passes
4. Merge

**Expected**: ✅ Merge succeeds

---

## 🔄 Maintenance

### Regular Reviews (Monthly)

- [ ] Verify status checks are still valid
- [ ] Review bypass permissions
- [ ] Check if rules need adjustment
- [ ] Audit merge history for violations

### Updating Status Checks

When adding new CI workflows:

1. Run workflow at least once
2. Edit branch protection rule
3. Add new status check
4. Save changes

### Temporarily Disabling Protection (Emergency Only)

**⚠️ Only in critical production incidents**

1. Settings → Branches
2. Edit protection rule
3. Uncheck required settings
4. Document reason in incident log
5. **Re-enable immediately after fix**

---

## 📝 Branch Protection Policy

### Policy Statement

> All production branches (`main`) and integration branches (`develop`) MUST have branch protection enabled at all times. Exceptions require written approval from project lead and must be documented.

### Enforcement

- **Automated**: GitHub enforces rules automatically
- **Audit**: Monthly review of protection settings
- **Incident Response**: Documented process for emergency overrides

### Violations

- Direct push to protected branch: Immediate revert + incident report
- Bypassing required reviews: Review process audit
- Disabling protection without approval: Escalation to project lead

---

## 🆘 Troubleshooting

### Problem: Can't Add Status Checks

**Solution**: Status checks must run at least once before they appear in the list.

1. Create a test PR
2. Let CI run completely
3. Return to branch protection settings
4. Status checks should now be available

### Problem: Merge Button Disabled Even After Approval

**Possible Causes**:
- Branch not up-to-date with base
- CI checks haven't passed
- Conversations not resolved
- Signed commits required but not provided

**Solution**: Check "Merge" section for specific blocker

### Problem: Admin Can't Bypass Protection

**Solution**: 
1. Edit branch protection rule
2. Enable "Allow specified actors to bypass required pull requests"
3. Add admin username
4. Save changes

### Problem: Force Push Needed for Rebase

**⚠️ Warning**: Only on feature branches, never `main` or `develop`

**Solution**:
```bash
git push origin feature/branch --force-with-lease
```

Protection rules only apply to `main` and `develop`, not feature branches.

---

## 📚 Resources

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
- [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

---

## ✅ Quick Setup Checklist

- [ ] Navigate to Settings → Branches
- [ ] Create rule for `main` branch
  - [ ] Require pull request
  - [ ] Require 1+ approval
  - [ ] Require status checks (after first CI run)
  - [ ] Require up-to-date branches
  - [ ] Prevent force pushes
  - [ ] Prevent deletions
- [ ] Create rule for `develop` branch (same settings)
- [ ] Test with dummy PR
- [ ] Document configuration
- [ ] Schedule monthly review

---

**Setup Time**: 10-15 minutes  
**Difficulty**: Beginner  
**Maintenance**: Monthly review recommended

---

**Last Updated**: 2025-01-23  
**Maintained By**: @Jackela  
**Version**: 1.0.0
