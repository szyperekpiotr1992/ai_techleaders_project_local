import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { resolve } from "node:path";
import {
  DatabaseConfigurationError,
  createDatabaseOptions,
  getMigrationsDirectory,
} from "./database-config";

const validEnvironment = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/devmentor",
};

describe("createDatabaseOptions", () => {
  it("requires a PostgreSQL connection URL without exposing its value", () => {
    assert.throws(
      () => createDatabaseOptions({}),
      (error: unknown) =>
        error instanceof DatabaseConfigurationError &&
        error.message.includes("DATABASE_URL is required"),
    );

    assert.throws(
      () =>
        createDatabaseOptions({
          DATABASE_URL: "not-a-url-with-secret",
        }),
      (error: unknown) =>
        error instanceof DatabaseConfigurationError &&
        !error.message.includes("not-a-url-with-secret"),
    );
  });

  it("rejects non-PostgreSQL URLs and URLs without a database or host", () => {
    for (const DATABASE_URL of [
      "mysql://localhost:3306/devmentor",
      "postgresql://localhost",
      "postgresql:///devmentor",
    ]) {
      assert.throws(
        () => createDatabaseOptions({ DATABASE_URL }),
        DatabaseConfigurationError,
      );
    }
  });

  it("validates pool settings and exposes bounded PostgreSQL pool options", () => {
    const defaults = createDatabaseOptions(validEnvironment);
    assert.deepEqual(defaults.pool, {
      max: 10,
      idleTimeoutMillis: 30_000,
    });

    const options = createDatabaseOptions({
      ...validEnvironment,
      DB_POOL_MAX: "12",
      DB_POOL_IDLE_TIMEOUT_MS: "45000",
    });

    assert.deepEqual(options.pool, {
      max: 12,
      idleTimeoutMillis: 45000,
    });
    assert.equal(options.clientUrl, validEnvironment.DATABASE_URL);
    assert.equal(options.migrations?.transactional, true);
    assert.equal(options.migrations?.allOrNothing, true);
    assert.equal(options.migrations?.safe, true);
    assert.equal(options.discovery?.warnWhenNoEntities, false);
    assert.equal(
      options.migrations?.path,
      resolve(process.cwd(), "packages/db/migrations"),
    );

    for (const invalidPoolValue of ["0", "not-a-number", "101"]) {
      assert.throws(
        () =>
          createDatabaseOptions({
            ...validEnvironment,
            DB_POOL_MAX: invalidPoolValue,
          }),
        DatabaseConfigurationError,
      );
    }

    for (const invalidIdleTimeout of ["0", "not-a-number", "300001"]) {
      assert.throws(
        () =>
          createDatabaseOptions({
            ...validEnvironment,
            DB_POOL_IDLE_TIMEOUT_MS: invalidIdleTimeout,
          }),
        DatabaseConfigurationError,
      );
    }
  });
});

describe("getMigrationsDirectory", () => {
  it("resolves migrations from the app workspace, db workspace, or repository root", () => {
    const repositoryRoot = resolve("repo");
    const expectedMigrationsDirectory = resolve(
      repositoryRoot,
      "packages",
      "db",
      "migrations",
    );

    assert.equal(
      getMigrationsDirectory(resolve(repositoryRoot, "packages", "app")),
      expectedMigrationsDirectory,
    );
    assert.equal(getMigrationsDirectory(repositoryRoot), expectedMigrationsDirectory);
    assert.equal(
      getMigrationsDirectory(resolve(repositoryRoot, "packages", "db")),
      expectedMigrationsDirectory,
    );
  });
});
