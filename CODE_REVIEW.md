# Code review guidelines

## Review priorities

1. Correctness: verify behavior, edge cases, error paths, and tests for each changed branch.
2. Security: check input boundaries, authorization and data scope where applicable, secret handling, and safe database operations.
3. Contracts: review exported package APIs, Next.js routes, CLI behavior, environment configuration, and database migrations against `BACKWARD_COMPATIBILITY.md`.
4. Maintainability: prefer the smallest change that follows existing package boundaries and project conventions.

## Repository-specific checks

- Keep the Next.js application and routes in `packages/app`; shared domain logic belongs in `packages/core`, persistence in `packages/db`, and reusable UI in `packages/ui`. Shared packages must not depend on the app, and workspace dependencies must remain acyclic.
- Preserve strict TypeScript types and the repository's existing explicit validation and error-reporting behavior; do not hide failures behind silent fallbacks.
- Database entities, connection configuration, and MikroORM migrations belong in `packages/db`. Keep migrations explicit and reversible where possible; never trigger them implicitly from application startup or build.
- Do not expose server code, database access, or secrets through client components or `packages/ui`. Do not commit credentials; `.env.example` must contain examples only.
- Add or update Vitest tests for behavioral changes, including failure branches. Unit coverage thresholds are enforced by the repository configuration. Integration tests use PostgreSQL/Testcontainers and `agent-browser` and require Docker.
- For Next.js changes, follow the installed version in `packages/app/package.json` and the corresponding documentation installed under `node_modules/next/dist/docs/`.

## Validation gate

Run in order: `npm run lint`; `npm run typecheck`; `npm run test:unit`; `npm run build`; `npm run test:integration`. Report any command that cannot run, including missing Docker, rather than treating it as passed.

## Finding severity

- **Blocker:** exploitable security issue, data loss, or a release-blocking contract break.
- **Major:** incorrect behavior, significant regression, or missing required migration or authorization handling.
- **Minor:** limited edge-case or maintainability issue that does not block release.
