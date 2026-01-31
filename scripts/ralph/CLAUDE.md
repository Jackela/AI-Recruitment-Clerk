# Ralph Agent Instructions - AI Recruitment Clerk

You are an autonomous coding agent working on the AI Recruitment Clerk project.

---

## CRITICAL PROJECT RULES (MUST FOLLOW)

### RULE 1: STRICT FAIL-FAST ARCHITECTURE
- **NO FALLBACK MECHANISMS**: Applications must start correctly or fail immediately
- **NO GRACEFUL DEGRADATION**: Fix root causes, not symptoms
- **IMMEDIATE FAILURE REQUIRED**: Any startup failure must surface the real problem

### RULE 2: ESM MODULE SYSTEM ONLY
- **ALL PROJECTS**: Must use `"type": "module"` in package.json
- **ALL TSCONFIG**: Must use `"module": "ES2022"` and `"target": "ES2022"`
- **NO COMMONJS**: CommonJS imports/exports are strictly prohibited

### RULE 3: TYPESCRIPT STRICT MODE ENFORCED
- **NO ANY TYPES**: All variables must have explicit types - use `unknown`, `Record<string, unknown>`, or specific interfaces
- **STRICT MODE**: All tsconfig files must have `"strict": true`
- **ERROR ON UNUSED**: `"noUnusedLocals": true, "noUnusedParameters": true`
- **COMPILATION MUST SUCCEED**: Zero tolerance for TypeScript errors

### RULE 4: CODE QUALITY STANDARDS
- **MODULAR DESIGN**: Files under 500 lines maximum
- **ENVIRONMENT SAFETY**: Never hardcode secrets or credentials
- **CLEAN ARCHITECTURE**: Strict separation of concerns
- **NO ROOT CLUTTER**: Never save working files to project root

### RULE 5: ERROR HANDLING PHILOSOPHY
- **SURFACE REAL PROBLEMS**: Never mask underlying issues
- **LOG WITH CONTEXT**: All errors must include actionable debugging information
- **FAIL LOUDLY**: Prefer obvious failures over silent degradation
- **NO SWALLOWING EXCEPTIONS**: Every error must be handled or propagated

---

## Your Task Workflow

1. **Read Current State**
   - Check `prd.json` for the highest priority story where `passes: false`
   - Read `progress.txt` for context from previous iterations (check Codebase Patterns section first)
   - Check you are on the correct branch from PRD `branchName`. If not, check it out or create from main.

2. **Execute ONE Story**
   - Pick the **highest priority** user story where `passes: false`
   - Implement ONLY that story - do not attempt multiple stories
   - Follow the acceptance criteria exactly
   - Keep changes focused and minimal

3. **Quality Checks (MANDATORY)**
   Run ALL of these before committing:
   ```bash
   # TypeScript compilation - MUST PASS
   npm run typecheck

   # ESLint - MUST PASS (no errors allowed)
   npm run lint

   # Unit tests - MUST PASS
   npm run test
   ```

   If ANY check fails:
   - Fix the issues
   - Re-run ALL checks
   - Do NOT commit until all pass

4. **Commit Your Work**
   - Stage all changes: `git add .`
   - Commit with message: `feat: [Story ID] - [Story Title]`
   - Include the story ID in commit message

5. **Update PRD**
   - Mark the story as `passes: true` in `prd.json`
   - Only mark as passing if ALL quality checks passed

6. **Record Learnings**
   Append to `progress.txt`:
   ```
   ## [Date/Time] - [Story ID]
   - What was implemented
   - Files changed
   - **Learnings for future iterations:**
     - Patterns discovered
     - Gotchas encountered
     - Useful context
   ---
   ```

7. **Exit Cleanly**
   - If ALL stories have `passes: true`, output: `<promise>COMPLETE</promise>`
   - Otherwise, end normally (next iteration picks up next story)

---

## Project Architecture

### Microservices
- **app-gateway** - API Gateway (Port 8080)
- **resume-parser-svc** - Resume parsing service
- **jd-extractor-svc** - Job description extraction service
- **scoring-engine-svc** - Scoring engine service
- **report-generator-svc** - Report generation service

### Frontend
- **ai-recruitment-frontend** - Angular 20.1 + NgRx

### Tech Stack
- **Frontend**: Angular 20.1, NgRx, TypeScript
- **Backend**: NestJS, TypeScript, MongoDB, Redis
- **Message Queue**: NATS JetStream

---

## Type Safety Guidelines

When fixing `any` types, use these patterns:

### Instead of `any`, use:
```typescript
// For unknown data structures
const data: unknown = await fetchData();

// For objects with unknown keys
const config: Record<string, unknown> = {};

// For specific structures, define interfaces
interface UserData {
  id: string;
  name: string;
  metadata?: Record<string, unknown>;
}

// For function parameters that accept multiple types
function process(input: string | number | Buffer): void {}

// For arrays with mixed content
const items: Array<string | number> = [];
```

### Schema Property Initialization
```typescript
// WRONG - default value initialization
@Prop()
eventId = '';

// CORRECT - type declaration with Mongoose default
@Prop({ default: '' })
eventId!: string;

// CORRECT - optional property
@Prop()
eventId?: string;
```

---

## Consolidate Patterns

If you discover a **reusable pattern**, add it to the `## Codebase Patterns` section at the TOP of `progress.txt`:

```
## Codebase Patterns
- Use `Record<string, unknown>` instead of `any` for dynamic objects
- Schema properties use `!` assertion with @Prop({ default: ... })
- All services must have corresponding .spec.ts test files
- ESLint rules are in eslint.config.mjs (warn rules should become error)
```

---

## Common Gotchas

1. **ESLint Configuration**: Current config has `warn` for many rules - stories may require changing to `error`
2. **Schema Files**: Property initialization pattern needs fixing in all schema files
3. **Test Files**: 8 new test files in git status need to be completed and committed
4. **E2E Tests**: Several debug test files should be consolidated

---

## Quality Requirements Summary

- ALL commits must pass: `npm run typecheck && npm run lint && npm run test`
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns
- ONE story per iteration
- Update `progress.txt` with learnings

---

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
```
<promise>COMPLETE</promise>
```

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).

---

## Important Reminders

- Work on **ONE story** per iteration
- Commit frequently with clear messages
- Keep CI green - all checks must pass
- Read the Codebase Patterns section in `progress.txt` before starting
- Never use `any` type - always use proper TypeScript types
- Follow ESM module patterns - no CommonJS
