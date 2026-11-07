# DevMentor Setup Installer — execution plan

Closes #2
Refs #3
Source doc: .ai/specs/2026-11-08-devmentor-setup-installer.md

## Goal

Ship a root `npm run setup` command that safely verifies or repairs the locked npm workspace install, then starts the existing development server.

## Scope

- Add a dependency-free Node.js setup script and root npm entry point.
- Verify installed dependency consistency conservatively; run `npm ci` when missing, invalid, stale, or uncertain.
- Preserve cross-platform invocation, terminal output, exit status, and Ctrl+C behavior.
- Add full branch/failure tests, wire the script into lint/typecheck/unit coverage, and document both setup paths.
- Do not change app runtime code, dependencies, lockfile, database data/schema, or migration behavior.

## Risks

The install-state check must not skip repair when manifests, lockfile, or workspace links are inconsistent. Use npm's own lockfile validation and installed-tree inspection; any unknown result triggers `npm ci`. Process spawning and signals differ on Windows, so test those paths without invoking a real package install.

## Implementation Plan

### Phase 1: Setup command

- 1.1 Implement the dependency-free root installer and `npm run setup`, including conservative install validation, cross-platform npm spawning, and failure/signal handling.
- 1.2 Add unit tests for valid skip, missing/incomplete/stale/uncertain installs, install failure, dev failure, and child termination; include code/tests in lint, typecheck, and 100% unit coverage.
- [ ] 1.3 Update README setup instructions while preserving the manual commands and explicit migration guidance; run the configured validation gate and review the final diff.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Setup command

- [x] 1.1 Implement the dependency-free root installer and `npm run setup`, including conservative install validation, cross-platform npm spawning, and failure/signal handling. — 5665c1b3fd92146b6217afaa47a2c81f6932c5b1
- [x] 1.2 Add unit tests for valid skip, missing/incomplete/stale/uncertain installs, install failure, dev failure, and child termination; include code/tests in lint, typecheck, and 100% unit coverage. — 5665c1b3fd92146b6217afaa47a2c81f6932c5b1
- [ ] 1.3 Update README setup instructions while preserving the manual commands and explicit migration guidance; run the configured validation gate and review the final diff.
