<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

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
  - `/scripts` - Utility scripts only

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

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.
