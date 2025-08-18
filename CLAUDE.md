# Claude Code Configuration - AI Recruitment Clerk

## 🚨 CRITICAL: CONCURRENT EXECUTION & FILE MANAGEMENT

**ABSOLUTE RULES**:
1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**MANDATORY PATTERNS:**
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message

### 📁 File Organization Rules

**NEVER save to root folder. Use these directories:**
- `/src` - Source code files
- `/tests` - Test files
- `/docs` - Documentation and markdown files
- `/config` - Configuration files
- `/scripts` - Utility scripts
- `/examples` - Example code

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

## Code Style & Best Practices

- **Modular Design**: Files under 500 lines
- **Environment Safety**: Never hardcode secrets
- **Test-First**: Write tests before implementation
- **Clean Architecture**: Separate concerns
- **Bento Grid UI**: Modern card-based interface design

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.
