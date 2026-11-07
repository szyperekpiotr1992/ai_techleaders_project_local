import { MikroORM } from "@mikro-orm/postgresql";
import { createDatabaseOptions } from "./database-config";

type PostgreSqlDatabase = InstanceType<typeof MikroORM>;

let databasePromise: Promise<PostgreSqlDatabase> | undefined;

export function createDatabase(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<PostgreSqlDatabase> {
  if (!databasePromise) {
    databasePromise = MikroORM.init(createDatabaseOptions(env)).catch(
      (error: unknown) => {
        databasePromise = undefined;
        throw error;
      },
    );
  }

  return databasePromise;
}

export async function closeDatabase(
  database: PostgreSqlDatabase,
): Promise<void> {
  try {
    await database.close(true);
  } finally {
    if (databasePromise && (await databasePromise) === database) {
      databasePromise = undefined;
    }
  }
}

export async function runMigrations(
  direction: "up" | "down",
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<number> {
  const orm = await MikroORM.init(createDatabaseOptions(env));

  try {
    const migrations =
      direction === "up"
        ? await orm.migrator.up()
        : await orm.migrator.down();
    return migrations.length;
  } finally {
    await orm.close(true);
  }
}
