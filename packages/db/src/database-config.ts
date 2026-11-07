import { basename, dirname, resolve } from "node:path";
import { defineConfig, type Options } from "@mikro-orm/postgresql";

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

function parsePositiveInteger(
  value: string | undefined,
  name: string,
  defaultValue: number,
  maximum: number,
): number {
  if (value === undefined || value === "") {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new DatabaseConfigurationError(
      `${name} must be an integer between 1 and ${maximum}.`,
    );
  }

  return parsed;
}

function validateDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new DatabaseConfigurationError(
      "DATABASE_URL is required to connect to PostgreSQL.",
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DatabaseConfigurationError(
      "DATABASE_URL must be a valid PostgreSQL connection URL.",
    );
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    url.pathname.length < 2
  ) {
    throw new DatabaseConfigurationError(
      "DATABASE_URL must include a PostgreSQL host and database name.",
    );
  }

  return value;
}

export function getMigrationsDirectory(cwd = process.cwd()): string {
  const directory = basename(cwd);
  const parentDirectory = basename(dirname(cwd));

  if (directory === "app" && parentDirectory === "packages") {
    return resolve(cwd, "../db/migrations");
  }

  if (directory === "db" && parentDirectory === "packages") {
    return resolve(cwd, "migrations");
  }

  return resolve(cwd, "packages/db/migrations");
}

export function createDatabaseOptions(
  env: Readonly<Record<string, string | undefined>> = process.env,
  cwd = process.cwd(),
): Options {
  const clientUrl = validateDatabaseUrl(env.DATABASE_URL);
  const max = parsePositiveInteger(env.DB_POOL_MAX, "DB_POOL_MAX", 10, 100);
  const idleTimeoutMillis = parsePositiveInteger(
    env.DB_POOL_IDLE_TIMEOUT_MS,
    "DB_POOL_IDLE_TIMEOUT_MS",
    30_000,
    300_000,
  );
  const migrationsDirectory = getMigrationsDirectory(cwd);

  return defineConfig({
    clientUrl,
    entities: [],
    discovery: {
      warnWhenNoEntities: false,
    },
    pool: {
      max,
      idleTimeoutMillis,
    },
    migrations: {
      path: migrationsDirectory,
      pathTs: migrationsDirectory,
      emit: "ts",
      transactional: true,
      allOrNothing: true,
      safe: true,
    },
  });
}
