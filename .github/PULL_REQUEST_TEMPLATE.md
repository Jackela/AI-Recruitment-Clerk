# Pull Request

## 📋 PR Information

**Type**: [feat | fix | refactor | perf | docs | style | test | chore | ci | revert]  
**Component**: [frontend | backend | shared-libs | infrastructure | docs]  
**Related Issue(s)**: Closes #(issue number) | Relates to #(issue number)  
**Breaking Change**: [Yes | No]

---

## 🎯 Description

### Summary
<!-- Provide a clear and concise description of the changes -->

### Motivation
<!-- Why are these changes needed? What problem does this PR solve? -->

### Approach
<!-- How did you solve the problem? What alternatives did you consider? -->

---

## 🔬 Changes Made

### Modified Components
<!-- List the main components/services affected -->
- [ ] Frontend (Angular)
- [ ] API Gateway
- [ ] Resume Parser Service
- [ ] JD Extractor Service
- [ ] Scoring Engine Service
- [ ] Report Generator Service
- [ ] Shared DTOs
- [ ] Infrastructure Shared
- [ ] Other: _____________

### Files Changed
<!-- Provide a summary of key file changes -->

**Added**:
- 

**Modified**:
- 

**Deleted**:
- 

### Database Changes
- [ ] No database changes
- [ ] Schema changes (describe below)
- [ ] Migration scripts included
- [ ] Backward compatible

**Details**:

### API Changes
- [ ] No API changes
- [ ] New endpoints added
- [ ] Existing endpoints modified
- [ ] Endpoints deprecated/removed
- [ ] Backward compatible

**Details**:

---

## 🧪 Testing Evidence

### Test Coverage
<!-- Provide evidence that changes are thoroughly tested -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

**Test Results**:
```
Test Suites: ___ passed, ___ failed, ___ total
Tests:       ___ passed, ___ failed, ___ total
Coverage:    ___% lines, ___% branches
```

### Testing Checklist
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Performance tested (if applicable)

### Manual Testing
<!-- Describe manual testing performed -->

**Test Environment**:
- OS: 
- Node.js Version: 
- Browser (if applicable): 

**Test Scenarios**:
1. 
2. 
3. 

**Screenshots/Videos** (if applicable):
<!-- Add screenshots or videos demonstrating the changes -->

---

## 📊 Quality Checks

### Code Quality
- [ ] Code follows project style guidelines
- [ ] TypeScript strict mode compliant
- [ ] No `any` types introduced
- [ ] Linter passes without warnings
- [ ] Code is self-documenting with clear naming
- [ ] Complex logic has comments explaining "why"

### Performance
- [ ] No performance regressions introduced
- [ ] Optimized database queries (if applicable)
- [ ] Efficient algorithms used
- [ ] Caching implemented where appropriate
- [ ] Resource usage acceptable

### Security
- [ ] No security vulnerabilities introduced
- [ ] Input validation implemented
- [ ] Authentication/authorization respected
- [ ] Secrets not hardcoded
- [ ] SQL injection prevention (if applicable)
- [ ] XSS prevention (if applicable)

---

## 📚 Documentation

- [ ] README updated (if needed)
- [ ] API documentation updated (if needed)
- [ ] Inline code comments added for complex logic
- [ ] CHANGELOG.md updated
- [ ] Migration guide provided (if breaking change)
- [ ] Architecture docs updated (if applicable)

---

## ⚠️ Breaking Changes

<!-- If this PR introduces breaking changes, describe them here -->

**Breaking Changes**: [Yes/No]

**Details**:
<!-- Describe what breaks and why -->

**Migration Path**:
<!-- Provide clear steps for users to migrate -->
1. 
2. 
3. 

**Deprecation Plan** (if applicable):
<!-- Timeline for deprecation and removal -->

---

## 🚀 Deployment Considerations

### Environment Variables
- [ ] No new environment variables
- [ ] New environment variables added (list below)
- [ ] Existing variables modified (list below)
- [ ] `.env.example` updated

**New/Modified Variables**:
```env
VARIABLE_NAME=description
```

### Infrastructure Changes
- [ ] No infrastructure changes
- [ ] Docker configuration updated
- [ ] Database migration required
- [ ] NATS subjects added/modified
- [ ] Redis keys/structure changed
- [ ] MongoDB indexes added

**Details**:

### Deployment Steps
<!-- Specific steps required for deployment -->
1. 
2. 
3. 

### Rollback Plan
<!-- How to rollback if deployment fails -->

---

## 🔗 Dependencies

### Related PRs
<!-- Link to related or dependent PRs -->
- 

### External Dependencies
- [ ] No new dependencies
- [ ] New npm packages added (list below)
- [ ] Dependency versions updated (list below)

**New Dependencies**:
| Package | Version | Purpose |
|---------|---------|---------|
|         |         |         |

**Updated Dependencies**:
| Package | Old Version | New Version | Reason |
|---------|-------------|-------------|--------|
|         |             |             |        |

---

## 📋 PR Checklist

### Before Requesting Review
- [ ] Self-review completed
- [ ] Code follows style guidelines
- [ ] All tests passing locally
- [ ] No console errors/warnings
- [ ] Branch is up-to-date with base branch
- [ ] Commits follow Conventional Commits format
- [ ] PR title follows Conventional Commits format

### Code Quality
- [ ] TypeScript compilation successful
- [ ] Linter passes (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Build successful (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] No TODO/FIXME comments added without issue links

### Documentation
- [ ] README updated (if needed)
- [ ] CHANGELOG.md updated
- [ ] JSDoc comments added for public APIs
- [ ] Complex logic documented
- [ ] Migration guide provided (if breaking)

### Security & Performance
- [ ] No hardcoded secrets or credentials
- [ ] Input validation implemented
- [ ] Error handling comprehensive
- [ ] Performance benchmarks acceptable
- [ ] Security scan passed (if applicable)

### For Reviewers
- [ ] Changes are backward compatible (or migration guide provided)
- [ ] Test coverage is adequate (>90% for new code)
- [ ] Documentation is clear and complete
- [ ] Code is maintainable and follows project patterns
- [ ] No obvious security vulnerabilities
- [ ] Performance impact is acceptable

---

## 💬 Additional Notes

### Review Focus Areas
<!-- Guide reviewers on what to focus on -->

### Known Issues
<!-- Any known issues or limitations -->

### Follow-up Work
<!-- Any follow-up work needed after this PR -->

---

## 🎓 Learning & Resources

<!-- Optional: Share useful resources or learnings from this PR -->

---

**Reviewer Notes**:
- Estimated review time: [Quick <30min | Medium 30-60min | Thorough >60min]
- Complexity: [Low | Medium | High]
- Risk level: [Low | Medium | High]

---

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
