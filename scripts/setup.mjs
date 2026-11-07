// @ts-check

import { spawn as spawnProcess } from "node:child_process";
import process from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const LOCKFILE_CHECK_ARGS = [
  "ci",
  "--dry-run",
  "--ignore-scripts",
  "--no-audit",
  "--no-fund",
  "--include=dev",
];
const INSTALLED_TREE_CHECK_ARGS = [
  "ls",
  "--all",
  "--silent",
  "--include=dev",
];
/**
 * @param {number | null} code
 * @param {NodeJS.Signals | null} signal
 */
function getExitCode(code, signal) {
  if (code !== null) {
    return code;
  }
  if (signal === "SIGINT") {
    return 130;
  }
  if (signal === "SIGTERM") {
    return 143;
  }
  return 1;
}

/**
 * @typedef {(command: string, args: string[], options: import("node:child_process").SpawnOptions) => import("node:child_process").ChildProcess} SpawnFunction
 */
/**
 * @typedef {Pick<import("node:events").EventEmitter, "once" | "removeListener">} SignalTarget
 */

/**
 * @param {string[]} args
 * @param {NodeJS.Platform} platform
 */
export function getNpmInvocation(args, platform) {
  const isWindows = platform === "win32";
  return {
    command: isWindows ? "npm.cmd" : "npm",
    args,
    shell: isWindows,
  };
}

/**
 * @param {string[]} args
 * @param {{
 *   cwd?: string,
 *   platform?: NodeJS.Platform,
 *   stdio?: import("node:child_process").StdioOptions,
 *   spawn?: SpawnFunction,
 *   signalTarget?: SignalTarget,
 * }} [options]
 * @returns {Promise<number>}
 */
export function runNpm(args, options = {}) {
  const {
    cwd = ROOT_DIR,
    platform = process.platform,
    stdio = "inherit",
    spawn = spawnProcess,
    signalTarget = process,
  } = options;
  const invocation = getNpmInvocation(args, platform);

  return new Promise((resolveExitCode, reject) => {
    const child = spawn(invocation.command, invocation.args, {
      cwd: resolve(cwd),
      env: process.env,
      shell: invocation.shell,
      stdio,
      windowsHide: true,
    });

    const cleanup = () => {
      signalTarget.removeListener("SIGINT", onSigint);
      signalTarget.removeListener("SIGTERM", onSigterm);
    };
    const onSigint = () => child.kill("SIGINT");
    const onSigterm = () => child.kill("SIGTERM");

    signalTarget.once("SIGINT", onSigint);
    signalTarget.once("SIGTERM", onSigterm);
    child.once("error", (error) => {
      cleanup();
      reject(error);
    });
    child.once("exit", (code, signal) => {
      cleanup();
      resolveExitCode(getExitCode(code, signal));
    });
  });
}

/**
 * @param {{
 *   cwd?: string,
 *   platform?: NodeJS.Platform,
 *   run?: typeof runNpm,
 *   log?: typeof console.log,
 * }} [options]
 * @returns {Promise<number>}
 */
export async function runSetup(options = {}) {
  const {
    cwd = ROOT_DIR,
    platform = process.platform,
    run = runNpm,
    log = console.log,
  } = options;
  const lockfileCheck = await run(LOCKFILE_CHECK_ARGS, {
    cwd,
    platform,
    stdio: "ignore",
  });
  const installedTreeCheck =
    lockfileCheck === 0
      ? await run(INSTALLED_TREE_CHECK_ARGS, {
          cwd,
          platform,
          stdio: "ignore",
        })
      : 1;

  if (lockfileCheck !== 0 || installedTreeCheck !== 0) {
    log("Installing or repairing workspace dependencies with npm ci...");
    const installExitCode = await run(["ci", "--include=dev"], {
      cwd,
      platform,
    });
    if (installExitCode !== 0) {
      return installExitCode;
    }
  }

  const devExitCode = await run(["run", "dev"], { cwd, platform });
  return devExitCode;
}
