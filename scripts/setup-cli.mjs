// @ts-check

import process from "node:process";
import { runSetup } from "./setup.mjs";

runSetup()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    console.error(
      "DevMentor setup failed:",
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  });
