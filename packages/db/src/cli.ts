import {
  DatabaseConfigurationError,
  runMigrations,
} from "./index";

type MigrationCliDependencies = {
  runMigrations: typeof runMigrations;
  logInfo: (message: string) => void;
  logError: (message: string) => void;
};

const defaultDependencies: MigrationCliDependencies = {
  runMigrations,
  logInfo: (message) => console.info(message),
  logError: (message) => console.error(message),
};

export async function runMigrationCli(
  direction: string | undefined,
  dependencies: MigrationCliDependencies = defaultDependencies,
): Promise<number> {
  try {
    if (direction !== "up" && direction !== "down") {
      throw new Error(
        "Choose an explicit migration direction: `npm run db:migrate` or `npm run db:migrate:down`.",
      );
    }

    const count = await dependencies.runMigrations(direction);
    dependencies.logInfo(
      direction === "up"
        ? `Applied ${count} migration(s).`
        : `Reverted ${count} migration(s).`,
    );
    return 0;
  } catch (error: unknown) {
    if (error instanceof DatabaseConfigurationError) {
      dependencies.logError(error.message);
    } else {
      dependencies.logError(
        "Database migration failed. Check database availability and migration files; connection details are redacted.",
      );
    }
    return 1;
  }
}
