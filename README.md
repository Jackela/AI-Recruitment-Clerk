# AI Recruitment Clerk

This repository hosts documentation and specifications for the **AI Recruitment Clerk** project. The codebase is a TypeScript/Angular monorepo managed with **Nx**.

## Workspace Layout

- `apps/` - Contains all NestJS microservices and the Angular frontend.
- `apps/<service>-e2e/` - End-to-end tests for each app using Playwright.
- `libs/` - Shared libraries and utilities.

## Common Commands

Use `pnpm` together with `nx` to manage tasks across the workspace:

```bash
pnpm install          # install dependencies
pnpm exec nx build <project>    # build a specific app or library
pnpm exec nx test <project>     # run unit tests
pnpm exec nx lint <project>     # lint a project
pnpm exec nx run-many --target=test --all   # run all tests
```
