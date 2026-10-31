import {
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
} from "awilix";
import { closeDatabase, createDatabase } from "@devmentor/db";

type ApplicationCradle = {
  databaseFactory: typeof createDatabase;
  database: ReturnType<typeof createDatabase>;
};

export function createApplicationContainer() {
  return createContainer<ApplicationCradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  }).register({
    databaseFactory: asValue(createDatabase),
    database: asFunction<ReturnType<typeof createDatabase>>(
      ({ databaseFactory }: ApplicationCradle) => databaseFactory(),
    )
      .singleton()
      .disposer((database) =>
        database.then((connection) => closeDatabase(connection)),
      ),
  });
}
