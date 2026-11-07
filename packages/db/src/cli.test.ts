import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseConfigurationError } from "./database-config";
import { runMigrations } from "./index";
import { runMigrationCli } from "./cli";

vi.mock("./index", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./index")>();
  return {
    ...actual,
    runMigrations: vi.fn(),
  };
});

function createDependencies() {
  return {
    runMigrations: vi.fn<typeof import("./database").runMigrations>(),
    logInfo: vi.fn<(message: string) => void>(),
    logError: vi.fn<(message: string) => void>(),
  };
}

describe("runMigrationCli", () => {
  beforeEach(() => {
    vi.mocked(runMigrations).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["up", 2, "Applied 2 migration(s)."],
    ["down", 1, "Reverted 1 migration(s)."],
  ] as const)("runs %s migrations and reports the count", async (
    direction,
    count,
    message,
  ) => {
    const dependencies = createDependencies();
    dependencies.runMigrations.mockResolvedValue(count);

    await expect(
      runMigrationCli(direction, dependencies),
    ).resolves.toBe(0);

    expect(dependencies.runMigrations).toHaveBeenCalledWith(direction);
    expect(dependencies.logInfo).toHaveBeenCalledWith(message);
    expect(dependencies.logError).not.toHaveBeenCalled();
  });

  it("rejects an unspecified migration direction without running migrations", async () => {
    const dependencies = createDependencies();

    await expect(runMigrationCli(undefined, dependencies)).resolves.toBe(1);

    expect(dependencies.runMigrations).not.toHaveBeenCalled();
    expect(dependencies.logError).toHaveBeenCalledWith(
      "Database migration failed. Check database availability and migration files; connection details are redacted.",
    );
  });

  it("reports database configuration errors without redacting the safe message", async () => {
    const dependencies = createDependencies();
    dependencies.runMigrations.mockRejectedValue(
      new DatabaseConfigurationError("DATABASE_URL is required."),
    );

    await expect(runMigrationCli("up", dependencies)).resolves.toBe(1);

    expect(dependencies.logError).toHaveBeenCalledWith(
      "DATABASE_URL is required.",
    );
  });

  it("redacts unexpected database errors", async () => {
    const dependencies = createDependencies();
    dependencies.runMigrations.mockRejectedValue(
      new Error("postgres://user:secret@db"),
    );

    await expect(runMigrationCli("down", dependencies)).resolves.toBe(1);

    expect(dependencies.logError).toHaveBeenCalledWith(
      "Database migration failed. Check database availability and migration files; connection details are redacted.",
    );
    expect(dependencies.logError).not.toHaveBeenCalledWith(
      expect.stringContaining("secret"),
    );
  });

  it("uses its default migration runner and success logger", async () => {
    vi.mocked(runMigrations).mockResolvedValue(3);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await expect(runMigrationCli("up")).resolves.toBe(0);

    expect(runMigrations).toHaveBeenCalledWith("up");
    expect(info).toHaveBeenCalledWith("Applied 3 migration(s).");
  });

  it("uses its default logger for configuration errors", async () => {
    vi.mocked(runMigrations).mockRejectedValue(
      new DatabaseConfigurationError("DATABASE_URL is required."),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMigrationCli("up")).resolves.toBe(1);

    expect(error).toHaveBeenCalledWith("DATABASE_URL is required.");
  });
});
