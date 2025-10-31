# Repository Guidelines

## Project Structure & Module Organization
- `apps/`: Deployable apps and services (e.g., `app-gateway`, `ai-recruitment-frontend`, `resume-parser-svc`).
- `libs/`: Reusable domain and shared libraries (e.g., `user-management-domain`, `infrastructure-shared`, `shared-dtos`).
- `e2e/`: Playwright end‑to‑end tests and helpers.
- `tools/` and `scripts/`: Project tooling and maintenance scripts.
- Config and metadata: `nx.json`, `tsconfig*.json`, `eslint.config.mjs`, `jest.config.cjs`, `.env.example`.

## Build, Test, and Development Commands
- Install deps: `npm ci` (Node >= 20.18). 
- Build gateway: `npm run build` (Nx builds `apps/app-gateway`).
- Run gateway (dev build output): `npm start` or `npm run start:prod` for production mode.
- Lint all: `npm run lint` (Nx run-many lint).
- Unit tests: `npm run test` (Jest projects for backend/frontend).
- CI coverage: `npm run test:ci` or `npm run test:coverage` (outputs to `coverage/`).
- E2E tests: `npm run test:e2e` (within `e2e/`), setup/cleanup via `test:e2e:setup` / `test:e2e:cleanup`.
- Type checks: `npm run typecheck`.

## Coding Style & Naming Conventions
- Language: TypeScript (NestJS backend, Angular frontend). Use 2‑space indent, single quotes (Prettier).
- Formatting: `npm run format` (targets `apps/**`, `libs/**`).
- Linting: ESLint with Nx flat config; enforce module boundaries (`@nx/enforce-module-boundaries`).
- Naming: folders/packages in kebab‑case; libraries under `libs/<domain>/`; specs end with `.spec.ts`.

## Testing Guidelines
- Frameworks: Jest (unit/integration), Playwright (E2E).
- Locations: Backend/Frontend unit tests under `apps/*/src/**/?(*.)spec.ts`; additional integration under `apps/app-gateway/test/**`.
- Run subsets: examples — `npm run test:integration`, `npm run test:integration:api`.
- Coverage: collected in CI; see `jest.config.cjs` for thresholds and project roots.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (e.g., `feat:`, `fix(ci):`, `refactor(frontend):`). See `git log` for patterns.
- PRs: include clear description, linked issues, and relevant screenshots/logs. Ensure passing lint, unit, and E2E checks.

## Security & Configuration Tips
- Environment: start from `.env.example`; never commit secrets. Review `SECURITY.md`.
- Docker/Orchestration: reference `docker-compose.*.yml` for local stacks; validate contracts via `npm run validate:contracts` before builds.

## Active Technologies
- TypeScript (Node.js 20.x) + Nx build system, NestJS backend services, Angular frontend, Jest, Playwright, npm audit tooling (001-harden-deps)
- Existing service data stores (MongoDB/PostgreSQL) unchanged; no new storage required (001-harden-deps)

## Recent Changes
- 001-harden-deps: Added TypeScript (Node.js 20.x) + Nx build system, NestJS backend services, Angular frontend, Jest, Playwright, npm audit tooling
