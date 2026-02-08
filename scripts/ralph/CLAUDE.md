# Ralph Agent Instructions

You are an autonomous coding agent working on a software project.

## Your Task

1. Read the PRD at `prd.json` (in the same directory as this file)
2. Read the progress log at `progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. Implement that single user story
6. Run quality checks (e.g., typecheck, lint, test - use whatever your project requires)
7. Update CLAUDE.md files if you discover reusable patterns (see below)
8. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
9. Update the PRD to set `passes: true` for the completed story
10. Append your progress to `progress.txt`

## Progress Report Format

APPEND to progress.txt (never replace, always append):
```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered (e.g., "this codebase uses X for Y")
  - Gotchas encountered (e.g., "don't forget to update Z when changing W")
  - Useful context (e.g., "the evaluation panel is in component X")
---
```

The learnings section is critical - it helps future iterations avoid repeating mistakes and understand the codebase better.

## Consolidate Patterns

If you discover a **reusable pattern** that future iterations should know, add it to the `## Codebase Patterns` section at the TOP of progress.txt (create it if it doesn't exist). This section should consolidate the most important learnings:

```
## Codebase Patterns
- Example: Use `sql<number>` template for aggregations
- Example: Always use `IF NOT EXISTS` for migrations
- Example: Export types from actions.ts for UI components
```

Only add patterns that are **general and reusable**, not story-specific details.

## Update CLAUDE.md Files

Before committing, check if any edited files have learnings worth preserving in nearby CLAUDE.md files:

1. **Identify directories with edited files** - Look at which directories you modified
2. **Check for existing CLAUDE.md** - Look for CLAUDE.md in those directories or parent directories
3. **Add valuable learnings** - If you discovered something future developers/agents should know:
   - API patterns or conventions specific to that module
   - Gotchas or non-obvious requirements
   - Dependencies between files
   - Testing approaches for that area
   - Configuration or environment requirements

**Examples of good CLAUDE.md additions:**
- "When modifying X, also update Y to keep them in sync"
- "This module uses pattern Z for all API calls"
- "Tests require the dev server running on PORT 3000"
- "Field names must match the template exactly"

**Do NOT add:**
- Story-specific implementation details
- Temporary debugging notes
- Information already in progress.txt

Only update CLAUDE.md if you have **genuinely reusable knowledge** that would help future work in that directory.

## Quality Requirements

- ALL commits must pass your project's quality checks (typecheck, lint, test)
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns

## Browser Testing (If Available)

For any story that changes UI, verify it works in the browser if you have browser testing tools configured (e.g., via MCP):

1. Navigate to the relevant page
2. Verify the UI changes work as expected
3. Take a screenshot if helpful for the progress log

If no browser tools are available, note in your progress report that manual browser verification is needed.

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

**CRITICAL: DO NOT output `<promise>COMPLETE</promise>` unless EVERY single story has `passes: true`.**

- If there are ANY stories with `passes: false`, end your response normally (another iteration will pick up the next story)
- Only when ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

**VERIFY: Before outputting `<promise>COMPLETE</promise>`, you must:
1. Read the PRD file
2. Check EVERY user story's `passes` field
3. Confirm ALL are `true`
4. Only then output the completion signal

If even ONE story has `passes: false`, DO NOT output `<promise>COMPLETE</promise>`.

## CI Scripts

### Local CI Scripts

This project has two main CI scripts for local development that mirror GitHub Actions:

- **`npm run ci:local`** - Fast local CI that runs the core checks from GitHub Actions CI workflow:
  - `npm run lint` - ESLint checks
  - `npm run typecheck` - TypeScript type checking
  - `npm run test:coverage` - Run tests with coverage reporting (generates `coverage/coverage-summary.json`)
  - `npm run audit` - Dependency security audit via Nx
  - `npm run build` - Production build verification

- **`npm run ci:full`** - Complete local CI that includes everything from `ci:local` plus:
  - `npm run test:e2e` - End-to-end Playwright tests

### What Runs Where

| Check | ci:local | ci:full | GitHub Actions CI |
|-------|----------|---------|-------------------|
| lint | ✅ | ✅ | ✅ |
| typecheck | ✅ | ✅ | ✅ |
| test:coverage | ✅ | ✅ | ✅ |
| audit | ✅ | ✅ | ✅ (via security workflow) |
| build | ✅ | ✅ | ✅ |
| E2E tests | ❌ | ✅ | ✅ |
| PII scan | ❌ | ❌ | ✅ |
| Secret scan | ❌ | ❌ | ✅ (via security workflow) |

### Coverage

Running `npm run test:coverage` generates the following files:
- `coverage/coverage-summary.json` - Machine-readable summary used by CI tools
- `coverage/lcov.info` - Standard LCOV format for Codecov
- `coverage/coverage-final.json` - Full coverage report

### Quality Gates

The project uses quality gate verification in `tools/ci/verify-quality-gates.mjs` which reads from `config/quality-gates.json`. Current threshold is 85% coverage.

## Important

- Work on ONE story per iteration
- Commit frequently
- Keep CI green
- Read the Codebase Patterns section in progress.txt before starting
