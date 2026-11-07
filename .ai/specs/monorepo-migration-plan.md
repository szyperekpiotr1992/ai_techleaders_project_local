# DevMentor Monorepo Migration Plan

Use npm Workspaces, preserving the current Next.js application while moving it into `packages/app` and introducing the shared package boundaries defined in `AGENTS.md` and `README.md`.

## Phases

### Phase 1 — Monorepo foundation and application move

**Status:** Complete

- Move the Next.js application, its static assets, and app-specific configuration into `packages/app`.
- Add npm Workspaces and create `@devmentor/app`, `@devmentor/core`, `@devmentor/db`, and `@devmentor/ui` packages with explicit internal dependencies and public entry points.
- Keep Next.js and Tailwind configuration working from the app workspace; expose root scripts for development, build, start, lint, and type checking.
- Install workspace dependencies and verify the migrated application with lint, type checking, and a production build.
- Verification passed: `npm.cmd ls --workspaces --depth=0`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`, and HTTP 200 smoke tests for `/`, `/next.svg`, and `/favicon.ico`.

**Completion criteria:** npm resolves and links all four workspaces; the Next.js app builds and starts from `packages/app`; existing root-page content and static assets remain available; lint, type checking, and build pass.

### Phase 2 — PostgreSQL persistence and dependency injection

**Status:** Complete

- Implement MikroORM PostgreSQL configuration and a shared connection pool in `packages/db`.
- Add safe environment-variable validation, migration discovery, and an explicit migration command; leave entity metadata empty until the domain schema is defined.
- Compose application services through Awilix in `packages/app`, keeping persistence details out of `packages/core` and client components.
- Add unit tests for environment validation, pool settings, migration path resolution, and lazy DI registration without connecting to PostgreSQL.
- Keep database migrations opt-in through explicit root scripts; never run them automatically on app startup or build.
- Verification passed: `npm.cmd run typecheck`, `npm.cmd test` (5 tests), `npm.cmd run lint`, `npm.cmd run build`, and HTTP 200 smoke tests for `/` and `/next.svg`.
- The migration command was checked with `DATABASE_URL` unset and failed explicitly with a safe configuration message. No database was configured for this phase, so no migration or shared database was touched.

**Completion criteria:** database configuration fails explicitly when required settings are missing; migrations are runnable only through an explicit command; the lazy database factory resolves from the Awilix container; relevant tests and type checking pass without requiring a shared database.

### Phase 3 — Shared UI and shadcn/ui integration

**Status:** Pending

- Configure shadcn/ui for the `packages/ui` workspace and ensure Tailwind scans shared UI sources.
- Place reusable components in `packages/ui` and consume them through the app's package imports.
- Verify client/server boundaries, style generation, lint, type checking, and the production build.

**Completion criteria:** shadcn/ui components are imported from `@devmentor/ui`, shared styles are included in the app build, and all applicable checks pass.

## Progress

- Confirmed npm Workspaces as the workspace manager.
- No prior specification or migration plan existed under `.ai/specs`.
- Completed Phase 1 without changing the existing home-page content or static assets.
- Completed Phase 2 with validated PostgreSQL configuration, a shared per-process ORM instance, explicit migration commands, and lazy Awilix registration.
- A real PostgreSQL connection and migration execution remain unverified until a local database and `DATABASE_URL` are provided; neither is required to complete this phase's no-shared-database gate.
