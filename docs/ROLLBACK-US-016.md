# Rollback Plan: US-016 - Add PR checklist automation

## Summary
Added GitHub Actions workflow (`.github/workflows/pr-template-check.yml`) to validate PR template sections. The workflow checks for required sections and provides helpful feedback when sections are missing.

## Changes Made

### 1. Created `.github/workflows/pr-template-check.yml`
- **Triggers**: PR opened, edited, reopened, synchronize
- **Validation**: Checks for required sections in PR description
- **Required sections**:
  - PR Type (feat, fix, refactor, etc.)
  - Breaking Change declaration (Yes/No)
  - Description section
  - Changes Made section
  - Testing Evidence section
  - PR Checklist section
- **Smart validation**: Requires rollback plan if breaking changes declared
- **Lightweight enforcement**: Uses warnings (not errors) for suggested checkboxes

### 2. No Changes to PR Template
- The existing `.github/PULL_REQUEST_TEMPLATE.md` already has all required checkboxes
- No modifications needed to the template itself

## Rollback Options

### Option 1: Disable the Workflow (Recommended for Temporary Issues)
```bash
# Rename the workflow to disable it
git mv .github/workflows/pr-template-check.yml .github/workflows/pr-template-check.yml.disabled
git commit -m "revert: disable PR template validation workflow"
```

### Option 2: Delete the Workflow
```bash
# Delete the workflow file
git rm .github/workflows/pr-template-check.yml
git commit -m "revert: remove PR template validation workflow"
```

### Option 3: Make Validation Optional (Warnings Only)
Edit `.github/workflows/pr-template-check.yml` and change:
```yaml
# From:
core.setFailed(output);

# To:
core.warning(output);
```

This will make all validations warnings instead of failures.

### Option 4: Revert the Commit
```bash
# Revert the commit that added the workflow
git revert <commit-hash>

# OR reset if this is the latest commit
git reset --hard HEAD~1
```

## Verification After Rollback

```bash
# Verify the workflow is removed/disabled
test -f .github/workflows/pr-template-check.yml && echo "Workflow exists" || echo "Workflow removed"

# Create a test PR to verify validation is disabled
# (skip this if you just want to verify the file is gone)
gh pr create --title "Test PR" --body "Minimal body" --draft
```

## Impact Assessment

### What This Change Affects
- **PR creation workflow**: All new PRs must include required sections
- **PR editing**: Validation runs when PR is edited or synchronized
- **Developer experience**: Provides immediate feedback on missing sections

### What This Change Does NOT Affect
- Existing PRs (validation only runs on opened, edited, reopened, synchronize)
- PR merging process (this is a separate check from CI/CD)
- Code functionality or runtime behavior

## Known Issues

### Potential Developer Friction
The validation may cause frustration if:
- Developers are not aware of the PR template
- The template is perceived as too long
- PRs are created from mobile devices

**Mitigation**:
- The workflow provides a helpful error message with a link to the template
- Consider documenting the PR template process in CONTRIBUTING.md
- Warnings (not errors) are used for suggested checkboxes

### False Positives
The workflow may flag PRs that:
- Use a different format but still have all necessary information
- Are from external contributors unaware of the template

**Mitigation**:
- Maintainers can manually override the check if needed
- The workflow can be disabled temporarily for specific scenarios

### Bypassing Validation
Developers can bypass the validation by:
1. Disabling the workflow (see rollback options)
2. Editing the PR after creation (validation runs on every edit)
3. Using GitHub CLI with `--body` flag

**Mitigation**: This is intentional - the check should be lightweight, not enforced strictly.

## Alternative Approaches

### 1. Danger.js
Use Danger.js for PR validation instead of GitHub Actions:

```ruby
# Dangerfile
def pr_template_check
  fail 'Missing PR Type' unless github.pr_title.include?(':')
  fail 'Missing Description' unless github.pr_body.include?('## Description')
  # ... more checks
end

pr_template_check
```

**Pros**: More flexible, can be extended with custom rules
**Cons**: Requires Ruby runtime, additional dependency, more complex setup

### 2. GitHub Apps
Use a GitHub app like:
- **Pull Request Template Checker**: Marketplace app
- **Mergeable**: Configurable PR validation

**Pros**: No code to maintain, feature-rich
**Cons**: Third-party dependency, may cost money, less control

### 3. Repository Rules (GitHub)
Use GitHub's built-in repository rules:

```
Settings → Rules → Add rule → Require metadata
```

**Pros**: Native GitHub feature, no code needed
**Cons**: Less flexible, cannot provide custom error messages

### 4. Manual Review
Rely on manual review to catch incomplete PRs.

**Pros**: Zero automation, no technical debt
**Cons**: Inconsistent, reviewer burden, things slip through

## Rollback Decision Matrix

| Scenario | Recommended Action |
|----------|-------------------|
| Causing too much friction | Disable temporarily (Option 1), then make validation warnings-only (Option 3) |
| False positives on valid PRs | Adjust validation logic (edit workflow) |
| Team prefers different approach | Delete and implement alternative (Option 2 + Alternative) |
| Not providing value | Delete permanently (Option 2) |

## Adjusting Validation Rules

To customize the validation rules, edit `.github/workflows/pr-template-check.yml`:

### Add a new required section:
```javascript
const requiredSections = [
  '## 🎯 Description',
  '## 🔬 Changes Made',
  '## 🧪 Testing Evidence',
  '## 📋 PR Checklist',
  '## Your New Section'  // Add here
];
```

### Remove a required section:
```javascript
const requiredSections = [
  '## 🎯 Description',
  // '## 🔬 Changes Made',  // Comment out to remove
  '## 🧪 Testing Evidence',
  '## 📋 PR Checklist'
];
```

### Change error to warning:
```javascript
// From:
errors.push(`Missing required section: ${section}`);

// To:
warnings.push(`Consider adding: ${section}`);
```

## Additional Notes

- **Lightweight by design**: Only checks for section headers, not content quality
- **Helpful feedback**: Error messages include the exact section that's missing
- **PR comment**: Automatically adds a comment on the PR with validation results
- **No permissions needed**: Only needs `contents: read` permission
- **Fast execution**: Runs in < 1 minute (timeout: 5 minutes)
- **No external dependencies**: Uses only GitHub Actions built-in features
- **Concurrent-safe**: Uses `concurrency` to cancel redundant runs
- **Smart rollback requirement**: Only requires rollback plan if breaking changes declared

## Related Documentation

- `.github/PULL_REQUEST_TEMPLATE.md`: Full PR template
- `CONTRIBUTING.md`: Contribution guidelines
- `docs/CI_RUNBOOK.md`: CI and local development practices
