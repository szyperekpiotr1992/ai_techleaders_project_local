# Backward compatibility policy

## Protected surfaces

- **TypeScript package entry points:** public exports from `packages/core/src/index.ts`, `packages/db/src/index.ts`, and `packages/ui/src/index.ts`. Removing or renaming an export, changing its type or runtime semantics, or adding a required argument is breaking for consumers.
- **Web routes:** routes under `packages/app/app`, currently including the root page. URL changes, removal of a route, or incompatible changes to externally consumed page behavior are breaking.
- **Database and persistence:** MikroORM configuration, PostgreSQL connection options, migration files under `packages/db/migrations`, and the explicit `npm run db:migrate` / `npm run db:migrate:down` commands. Destructive or incompatible schema changes require a reviewed migration and rollback plan; do not run migrations against a shared database without approval.
- **CLI and runtime configuration:** database CLI behavior and flags, `DATABASE_URL`, `DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT_MS`, and committed configuration formats such as `.ai/agentic.config.json`. Changing names, defaults, accepted values, or side effects may break operators and automation.
- **Workspace package names and exports:** consumers use the `@devmentor/*` workspace packages; preserve dependency direction and documented package responsibilities.

No published event or webhook surface was found in the current repository inventory. Add one here if introduced.

## Change requirements

Prefer additive, backward-compatible changes. For an unavoidable breaking change, document the affected consumers and upgrade steps in the PR, provide a migration or deprecation path where feasible, and obtain maintainer approval before merging. Database changes must include the migration and rollback considerations; interface changes must update tests and documentation and exercise affected consumers. Keep this policy aligned with `README.md` and package entry points.
