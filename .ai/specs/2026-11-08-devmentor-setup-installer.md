# DevMentor Setup Installer

## 📝 TLDR
Developers cloning DevMentor currently need to install dependencies and start the app as separate commands. This proposal adds a root `npm run setup` entry point that verifies or installs the locked workspace dependencies, then starts the existing development server. The manual `npm ci` and `npm run dev` path remains available.

## 📝 Problem Statement
The [README onboarding instructions](../../README.md#uruchamianie-i-kontrola) currently require users to run `npm ci` followed by `npm run dev`. Issue [#2](https://github.com/szyperekpiotr1992/ai_techleaders_project_local/issues/2) requests a repeatable, idempotent setup command, including recovery from missing or stale dependencies. The repository is an npm Workspaces monorepo; the root scripts already delegate development to `@devmentor/app`.

## 📝 Proposed Solution
Add a dependency-free Node.js script under root `scripts/` and expose it as `npm run setup` in the root `package.json`. The script runs from the workspace root, determines whether the installed dependencies are complete and compatible with the root/workspace manifests and lockfile, and skips installation only when that can be positively verified. It should use npm's installed-tree validation and installed lock metadata where available; if validation is incomplete or inconsistent, it runs `npm ci`. After a successful install or verified skip, it starts the existing `npm run dev`.

The child commands inherit terminal input/output so users see install and server logs and can interact with or stop the development server. The script must work on Windows and POSIX systems, preserve the current environment, and return a non-zero status when installation or server startup fails. It must not edit manifests or the lockfile.

This follows npm's native mechanisms rather than introducing a package manager or setup dependency: npm documents `npm ci` as the lockfile-based clean install, which removes an existing `node_modules` and fails when the lockfile and manifest disagree; `npm run` is the supported entry point for package scripts ([npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci), [npm scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts)). A custom installer UI, package manager abstraction, and per-package installation are out of scope.

## 📝 Architecture
The root `package.json` exposes the command; `scripts/setup.mjs` uses Node built-ins to inspect the root install and launch npm child processes. npm remains responsible for installing dependencies and the existing `dev` script remains responsible for starting `@devmentor/app`. No shared package or app runtime code changes are needed.

The current root lint and test/typecheck configurations enumerate their input paths. They must be extended to lint, test, and typecheck the installer and its tests without weakening existing checks or coverage thresholds.

## 📝 Data Model
None. The setup command changes only local `node_modules`; it does not modify application data, database schema, or committed manifests/lockfiles.

## 📝 API Contracts

### CLI

- **Invocation:** `npm run setup` from the repository root.
- **Behavior:** Verify the dependency installation; run `npm ci` if missing, incomplete, inconsistent with the locked workspace dependencies, or unverifiable; then run the existing `npm run dev`.
- **Output:** Preserve child-process stdout and stderr. Keep the command attached to the development server until it exits or the user stops it.
- **Exit status:** Return success only if dependency validation/install and dev-server startup succeed. Propagate child failures as a non-zero status; do not start the server after failed dependency installation.
- **Compatibility:** Use the installed Node.js and npm; do not require a dependency that exists only after `npm ci`. Support Windows as well as POSIX shells.

## 📝 Edge Cases & Failure Scenarios

- A complete installation compatible with all workspace manifests and the lockfile skips `npm ci` and starts the server.
- Missing `node_modules`, missing workspace links, an incomplete/invalid installed tree, changed manifests or lockfile, or inability to prove the install is consistent causes a clean `npm ci`.
- If `npm ci` fails (including a manifest/lockfile mismatch or registry/network error), show its output, return failure, and do not start the app.
- If `npm run dev` fails to start or exits unsuccessfully, surface the failure and return non-zero.
- Ctrl+C or normal process termination stops the child command instead of leaving an orphaned development server.
- The setup command never runs `db:migrate` or `db:migrate:down`, connects to PostgreSQL, or requires `DATABASE_URL`.
- A missing Node.js/npm installation prevents npm from invoking the setup script; README prerequisites must state this clearly.

## 📝 Risks & Impact Review
This is an additive root CLI command and documentation change. It does not alter protected persistence contracts or app routes in [BACKWARD_COMPATIBILITY.md](../../BACKWARD_COMPATIBILITY.md). `npm ci` can delete and recreate local `node_modules`, as documented by npm; it does not change committed manifests/lockfiles or application data. Reverting the change removes the setup entry point while preserving the existing manual startup path.

The main correctness risk is an overly permissive installed-state check that skips a necessary reinstall. Therefore uncertainty must choose `npm ci`, and tests must prove both the valid-install skip path and repair paths. The implementation uses no new production dependency.

## 📋 Phasing

### Phase 1 — Repeatable local setup
Deliver the root setup command, cross-platform installer, regression tests, and README instructions as one independently shippable feature.

## 📋 Implementation Plan

1. **Add the installer and root command.** Implement `scripts/setup.mjs` using Node built-ins; handle npm invocation across Windows and POSIX; validate dependency state conservatively; run `npm ci` when needed; then spawn `npm run dev` with inherited stdio and reliable exit/signal handling. Add the root `setup` script. Keep the application usable through the existing `npm run dev` command.
2. **Add complete automated coverage.** Test the valid-install skip, missing/incomplete/stale/unverifiable install, install failure, dev-server failure, and child termination paths using isolated fixtures and mocked child processes (no real network or database). Include installer code in lint/typecheck/test configuration and require 100% unit coverage of its behavior without lowering existing thresholds.
3. **Document both entry paths.** Update README requirements and startup instructions for `npm run setup`, explain that it leaves the dev server running until stopped, and retain the explicit `npm ci` + `npm run dev` alternative. State that database migrations remain a separate, manual action.
