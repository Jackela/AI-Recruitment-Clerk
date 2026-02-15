# Claude Code Configuration - AI Recruitment Clerk

## 🚨 CRITICAL PROJECT RULES

### RULE 1: STRICT FAIL-FAST ARCHITECTURE

- **NO FALLBACK MECHANISMS**: Applications must start correctly or fail immediately
- **NO GRACEFUL DEGRADATION**: Fix root causes, not symptoms
- **NO BACKUP SERVERS**: simple-server.js, enhanced-server.js, hybrid-server.js are FORBIDDEN
- **IMMEDIATE FAILURE REQUIRED**: Any startup failure must surface the real problem

### RULE 2: ESM MODULE SYSTEM ONLY

- **ALL PROJECTS**: Must use `"type": "module"` in package.json
- **ALL TSCONFIG**: Must use `"module": "ES2022"` and `"target": "ES2022"`
- **NO COMMONJS**: CommonJS imports/exports are strictly prohibited
- **ANGULAR/NESTJS COMPATIBILITY**: Must maintain ESM compatibility across all services

**KNOWN EXCEPTION: Webpack Configs (.cjs)**

- Nx's `@nx/webpack` plugin uses `require()` to load webpack configs during project graph processing
- This is an Nx limitation, not a violation of ESM-first architecture
- Webpack configs MUST use `.cjs` extension with CommonJS syntax (`require`/`module.exports`)
- The built output can still be ESM - only the config file needs to be `.cjs`
- See: `apps/app-gateway/webpack.config.cjs`, `scripts/ralph/progress.txt` (Codebase Patterns)

### RULE 3: TYPESCRIPT STRICT MODE ENFORCED

- **NO 'ANY' TYPES**: All variables must have explicit types
- **STRICT MODE**: All tsconfig files must have `"strict": true`
- **ERROR ON UNUSED**: `"noUnusedLocals": true, "noUnusedParameters": true`
- **COMPILATION MUST SUCCEED**: Zero tolerance for TypeScript errors

### RULE 4: CONCURRENT EXECUTION PATTERNS

- **BATCH ALL OPERATIONS**: Never split related operations across multiple messages
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message

### RULE 5: FILE ORGANIZATION HIERARCHY

- **NO ROOT CLUTTER**: Never save working files to project root
- **STRICT DIRECTORIES**:
  - `/src` - Source code files only
  - `/tests` - Test files only
  - `/docs` - Documentation only
  - `/config` - Configuration only
    - `/config/docker` - Docker compose and dockerignore files
    - `/config/deployment` - Platform deployment configs (railway.json, render.yaml)
  - `/scripts` - Utility scripts only (shell scripts, batch files, automation)

### RULE 5.1: SHARED LIBRARIES ORGANIZATION

- **libs/configuration** - Environment variable validation utility
- **libs/infrastructure-shared** - Error handling, validation, utilities
- **libs/service-base** - BaseMicroserviceService for NATS services
- **libs/shared-nats-client** - NATS client connection management
- **libs/types** - Shared TypeScript type definitions
- **libs/\*-domain** - Domain-specific business logic

## Codebase Patterns

### Base Class Usage

- **BaseMicroserviceService** (`libs/service-base`): Extend for all NATS microservices
  - Inherits from NatsClientService for connection/subscription management
  - Provides: `publishEvent()`, `publishErrorEvent()`, `subscribeToEvents()`
  - Used by: resume-parser-svc, jd-extractor-svc, scoring-engine-svc, report-generator-svc
- **Testing pattern**: Mock lowest-level methods (NatsClientService) not intermediate protected methods

### Component Splitting (Mobile)

- Components over 500 lines should be split into smaller components
- Extract display logic to separate component (e.g., `*-display.component.ts`)
- Extract filter logic to separate component (e.g., `*-filter.component.ts`)
- Extract business logic to service (e.g., `mobile-*.service.ts`)
- Service uses BehaviorSubject pattern for reactive state management

### Service Layering (Domain Services)

- **UserCrudService**: Basic CRUD operations (create, read, update, delete, soft delete)
- **UserAuthService**: Authentication operations (login, password verify, auth activity)
- **UserManagementService**: Facade that delegates to CRUD and auth services

### Environment Validation

- Use `@ai-recruitment-clerk/configuration` for env validation on startup
- Service schemas: `appGateway`, `resumeParser`, `jdExtractor`, `scoringEngine`, `reportGenerator`, `frontend`
- Type-safe access: `env.getString()`, `env.getNumber()`, `env.getBoolean()`, `env.getArray()`, `env.getUrl()`

## Project Overview

AI Recruitment Clerk - 智能简历筛选和分析系统，使用Angular + NestJS + 微服务架构。

## Build Commands

- `npm run build` - Build project
- `npm run test` - Run tests
- `npm run lint` - Linting
- `npm run typecheck` - Type checking

## 🏗️ Architecture

### Microservices

- **app-gateway** - API Gateway (Port 8080)
- **resume-parser-svc** - 简历解析服务
- **jd-extractor-svc** - 职位描述提取服务
- **scoring-engine-svc** - 评分引擎服务
- **report-generator-svc** - 报告生成服务

### Frontend

- **ai-recruitment-frontend** - Angular应用 (集成Bento Grid设计)

### Tech Stack

- **Frontend**: Angular 20.1, NgRx, TypeScript
- **Backend**: NestJS, TypeScript, MongoDB, Redis
- **Message Queue**: NATS JetStream
- **Deployment**: Docker, Railway

## RULE 6: CODE QUALITY STANDARDS

- **MODULAR DESIGN**: Files under 500 lines maximum
- **ENVIRONMENT SAFETY**: Never hardcode secrets or credentials
- **TEST-FIRST DEVELOPMENT**: Write tests before implementation
- **CLEAN ARCHITECTURE**: Strict separation of concerns
- **BENTO GRID UI**: Consistent modern card-based interface design

## RULE 7: DEPLOYMENT & PRODUCTION STANDARDS

- **RAILWAY OPTIMIZATION**: Build must succeed or deployment fails
- **HEALTH CHECKS**: `/api/health` endpoint must be reliable
- **NO MOCKING IN PRODUCTION**: Remove all mock data and services
- **ENVIRONMENT VALIDATION**: All required environment variables must be validated

## RULE 8: ERROR HANDLING PHILOSOPHY

- **SURFACE REAL PROBLEMS**: Never mask underlying issues
- **LOG WITH CONTEXT**: All errors must include actionable debugging information
- **FAIL LOUDLY**: Prefer obvious failures over silent degradation
- **NO SWALLOWING EXCEPTIONS**: Every error must be handled or propagated

### ⚡ ENFORCEMENT PRIORITY

1. **FAIL-FAST** > graceful degradation
2. **ESM MODULES** > CommonJS compatibility
3. **TYPE SAFETY** > runtime flexibility
4. **ROOT CAUSE FIXES** > temporary workarounds
5. **IMMEDIATE FEEDBACK** > delayed error discovery

## RULE 9: PARALLEL EXECUTION WITH SUBAGENTS

- **USE TASK TOOL PROACTIVELY**: When facing multiple independent tasks, spawn subagents in parallel
- **PREFER PARALLELISM**: Don't sequence tasks that can run independently
- **BATCH EXPLORATION**: Use Explore agents to search codebase in parallel (up to 3 at once)
- **DELEGATE COMPLEX WORK**: Use Plan agents for architecture decisions, code-reviewer for PRs
- **MAXIMIZE EFFICIENCY**: One message with multiple Task calls > multiple sequential messages

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.

# Ralph Agent Instructions

You are an autonomous coding agent working on a software project.

## Your Task

1. Read the PRD at `scripts/ralph/prd.json`
2. Read the progress log at `scripts/ralph/progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. Implement that single user story
6. Run quality checks (e.g., typecheck, lint, test - use whatever your project requires)
7. Update CLAUDE.md files if you discover reusable patterns (see below)
8. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
9. Update the PRD to set `passes: true` for the completed story
10. Append your progress to `scripts/ralph/progress.txt`

## Progress Report Format

APPEND to scripts/ralph/progress.txt (never replace, always append):

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

If you discover a **reusable pattern** that future iterations should know, add it to the `## Codebase Patterns` section at the TOP of scripts/ralph/progress.txt (create it if it doesn't exist). This section should consolidate the most important learnings:

```
## Codebase Patterns
- Example: Use `sql<number>` template for aggregations
- Example: Always use `IF NOT EXISTS` for migrations
- Example: Export types from actions.ts for UI components
```

Only add patterns that are **general and reusable**, not story-specific details.

## Quality Requirements

- ALL commits must pass your project's quality checks (typecheck, lint, test)
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).

**CRITICAL:** The string `<promise>COMPLETE</promise>` is a termination signal for the Ralph script. NEVER output this string unless you are absolutely certain ALL stories are complete. Do NOT mention it in summaries, explanations, jokes, or self-referential comments. The script uses regex matching and will terminate immediately upon seeing this text.

## Important

- Work on ONE story per iteration
- Commit frequently
- Keep CI green
- Read the Codebase Patterns section in scripts/ralph/progress.txt before starting
