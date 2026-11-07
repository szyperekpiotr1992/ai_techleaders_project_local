import { runMigrationCli } from "./cli";

void runMigrationCli(process.argv[2]).then((exitCode) => {
  process.exitCode = exitCode;
});
