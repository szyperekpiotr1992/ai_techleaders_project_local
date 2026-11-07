import { EventEmitter } from "node:events";
import type { ChildProcess, SpawnOptions } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { getNpmInvocation, runNpm, runSetup } from "./setup.mjs";

function createSpawn(child: ChildProcess) {
  return vi.fn((command: string, args: string[], options: SpawnOptions) => {
    void command;
    void args;
    void options;
    return child;
  });
}

describe("getNpmInvocation", () => {
  it("uses npm.cmd through a shell on Windows", () => {
    expect(getNpmInvocation(["ci"], "win32")).toEqual({
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", "npm.cmd ci"],
      shell: false,
    });
  });

  it("uses npm directly without a shell on POSIX", () => {
    expect(getNpmInvocation(["ci"], "linux")).toEqual({
      command: "npm",
      args: ["ci"],
      shell: false,
    });
  });
});

describe("runNpm", () => {
  it("spawns npm with inherited environment and resolves the child exit code", async () => {
    const child = new EventEmitter() as ChildProcess;
    child.kill = vi.fn(() => true);
    const spawn = createSpawn(child);
    const signalTarget = new EventEmitter();

    const result = runNpm(["run", "dev"], {
      cwd: "D:\\workspace",
      platform: "win32",
      spawn,
      signalTarget,
    });

    expect(spawn).toHaveBeenCalledWith(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/s", "/c", "npm.cmd run dev"],
      expect.objectContaining({
        cwd: "D:\\workspace",
        env: process.env,
        shell: false,
        stdio: "inherit",
        windowsHide: true,
      }),
    );
    child.emit("exit", 7, null);
    await expect(result).resolves.toBe(7);
    expect(signalTarget.listenerCount("SIGINT")).toBe(0);
    expect(signalTarget.listenerCount("SIGTERM")).toBe(0);
  });

  it.each([
    ["SIGINT", 130],
    ["SIGTERM", 143],
    ["SIGKILL", 1],
  ] as const)("maps a child %s exit to status %i", async (signal, code) => {
    const child = new EventEmitter() as ChildProcess;
    child.kill = vi.fn(() => true);
    const spawn = createSpawn(child);
    const signalTarget = new EventEmitter();
    const result = runNpm(["ci"], {
      spawn,
      signalTarget,
    });

    child.emit("exit", null, signal);

    await expect(result).resolves.toBe(code);
  });

  it.each(["SIGINT", "SIGTERM"] as const)(
    "forwards parent %s to the npm child",
    async (signal) => {
      const child = new EventEmitter() as ChildProcess;
      child.kill = vi.fn(() => true);
      const spawn = createSpawn(child);
      const signalTarget = new EventEmitter();
      const result = runNpm(["run", "dev"], {
        spawn,
        signalTarget,
      });

      signalTarget.emit(signal);
      expect(child.kill).toHaveBeenCalledWith(signal);
      child.emit("exit", null, signal);

      await expect(result).resolves.toBe(signal === "SIGINT" ? 130 : 143);
    },
  );

  it("rejects when npm cannot be spawned", async () => {
    const child = new EventEmitter() as ChildProcess;
    child.kill = vi.fn(() => true);
    const spawn = createSpawn(child);
    const signalTarget = new EventEmitter();
    const result = runNpm(["ci"], {
      spawn,
      signalTarget,
    });
    const error = new Error("npm executable was not found");

    child.emit("error", error);

    await expect(result).rejects.toBe(error);
    expect(signalTarget.listenerCount("SIGINT")).toBe(0);
    expect(signalTarget.listenerCount("SIGTERM")).toBe(0);
  });
});

describe("runSetup", () => {
  it("skips installation when lockfile and installed tree checks pass", async () => {
    const run = vi.fn().mockResolvedValue(0);
    const log = vi.fn();

    await expect(runSetup({ cwd: "D:\\repo", run, log })).resolves.toBe(0);

    expect(run).toHaveBeenNthCalledWith(
      1,
      [
        "ci",
        "--dry-run",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--include=dev",
      ],
      { cwd: "D:\\repo", platform: process.platform, stdio: "ignore" },
    );
    expect(run).toHaveBeenNthCalledWith(
      2,
      ["ls", "--all", "--silent", "--include=dev"],
      { cwd: "D:\\repo", platform: process.platform, stdio: "ignore" },
    );
    expect(run).toHaveBeenNthCalledWith(3, ["run", "dev"], {
      cwd: "D:\\repo",
      platform: process.platform,
    });
    expect(log).not.toHaveBeenCalled();
  });

  it("repairs an invalid lockfile/install state before starting dev", async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    const log = vi.fn();

    await expect(runSetup({ run, log })).resolves.toBe(0);

    expect(run).toHaveBeenCalledTimes(3);
    expect(run).toHaveBeenNthCalledWith(
      2,
      ["ci", "--include=dev"],
      expect.objectContaining({
        cwd: expect.any(String),
        platform: process.platform,
      }),
    );
    expect(run).toHaveBeenNthCalledWith(
      3,
      ["run", "dev"],
      expect.objectContaining({ cwd: expect.any(String) }),
    );
    expect(log).toHaveBeenCalledOnce();
  });

  it("repairs an incomplete installed dependency tree", async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    await expect(runSetup({ run })).resolves.toBe(0);

    expect(run).toHaveBeenCalledTimes(4);
    expect(run).toHaveBeenNthCalledWith(3, ["ci", "--include=dev"], {
      cwd: expect.any(String),
      platform: process.platform,
    });
  });

  it("does not start dev when dependency installation fails", async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(23);

    await expect(runSetup({ run })).resolves.toBe(23);

    expect(run).toHaveBeenCalledTimes(3);
  });

  it("returns the dev server failure status", async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(42);

    await expect(runSetup({ run })).resolves.toBe(42);
  });

  it("propagates npm execution errors", async () => {
    const error = new Error("unable to start npm");
    const run = vi.fn().mockRejectedValue(error);

    await expect(runSetup({ run })).rejects.toBe(error);
  });
});
