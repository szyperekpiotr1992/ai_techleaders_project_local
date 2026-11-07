import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MikroORM } from "@mikro-orm/postgresql";
import { createDatabaseOptions } from "./database-config";
import { closeDatabase, createDatabase, runMigrations } from "./database";

vi.mock("@mikro-orm/postgresql", () => ({
  MikroORM: {
    init: vi.fn(),
  },
}));

vi.mock("./database-config", () => ({
  createDatabaseOptions: vi.fn(() => ({ clientUrl: "postgresql://test/db" })),
}));

type MockOrm = {
  close: ReturnType<typeof vi.fn>;
  migrator: {
    up: ReturnType<typeof vi.fn>;
    down: ReturnType<typeof vi.fn>;
  };
};

const environment = { DATABASE_URL: "postgresql://test/db" };

function createOrm(): MockOrm {
  return {
    close: vi.fn().mockResolvedValue(undefined),
    migrator: {
      up: vi.fn().mockResolvedValue([]),
      down: vi.fn().mockResolvedValue([]),
    },
  };
}

function asMikroOrm(orm: MockOrm): InstanceType<typeof MikroORM> {
  return orm as unknown as InstanceType<typeof MikroORM>;
}

describe("createDatabase", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createDatabaseOptions).mockReturnValue({
      clientUrl: "postgresql://test/db",
    } as ReturnType<typeof createDatabaseOptions>);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("initializes one shared database promise with the requested environment", async () => {
    const orm = createOrm();
    vi.mocked(MikroORM.init).mockResolvedValue(asMikroOrm(orm));

    const first = createDatabase(environment);
    const second = createDatabase({ DATABASE_URL: "postgresql://other/db" });

    expect(first).toBe(second);
    expect(createDatabaseOptions).toHaveBeenCalledOnce();
    expect(createDatabaseOptions).toHaveBeenCalledWith(environment);
    await expect(first).resolves.toBe(orm);

    await closeDatabase(asMikroOrm(orm));
    expect(orm.close).toHaveBeenCalledWith(true);
  });

  it("clears a rejected initialization so a later call can retry", async () => {
    const failure = new Error("connection failed");
    const orm = createOrm();
    vi.mocked(MikroORM.init)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(asMikroOrm(orm));

    await expect(createDatabase(environment)).rejects.toBe(failure);
    await expect(createDatabase(environment)).resolves.toBe(orm);
    expect(MikroORM.init).toHaveBeenCalledTimes(2);

    await closeDatabase(asMikroOrm(orm));
  });

  it("keeps the shared connection when closing a different database", async () => {
    const sharedOrm = createOrm();
    const otherOrm = createOrm();
    vi.mocked(MikroORM.init).mockResolvedValue(asMikroOrm(sharedOrm));

    const sharedPromise = createDatabase(environment);
    await closeDatabase(asMikroOrm(otherOrm));

    expect(createDatabase(environment)).toBe(sharedPromise);
    await closeDatabase(asMikroOrm(sharedOrm));
  });

  it("clears the shared connection even when closing it fails", async () => {
    const orm = createOrm();
    const failure = new Error("close failed");
    orm.close.mockRejectedValueOnce(failure);
    vi.mocked(MikroORM.init)
      .mockResolvedValueOnce(asMikroOrm(orm))
      .mockResolvedValueOnce(asMikroOrm(createOrm()));

    await createDatabase(environment);
    await expect(closeDatabase(asMikroOrm(orm))).rejects.toBe(failure);

    const retry = createDatabase(environment);
    expect(MikroORM.init).toHaveBeenCalledTimes(2);
    await retry;
  });

  it("closes a database even when it is not the cached connection", async () => {
    const orm = createOrm();

    await closeDatabase(asMikroOrm(orm));

    expect(orm.close).toHaveBeenCalledWith(true);
  });
});

describe("runMigrations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createDatabaseOptions).mockReturnValue({
      clientUrl: "postgresql://test/db",
    } as ReturnType<typeof createDatabaseOptions>);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it.each([
    ["up", "up", 2],
    ["down", "down", 1],
  ] as const)("runs the %s direction and returns the migration count", async (
    direction,
    method,
    count,
  ) => {
    const orm = createOrm();
    orm.migrator[method].mockResolvedValueOnce(Array.from({ length: count }));
    vi.mocked(MikroORM.init).mockResolvedValue(asMikroOrm(orm));

    await expect(runMigrations(direction, environment)).resolves.toBe(count);

    expect(createDatabaseOptions).toHaveBeenCalledWith(environment);
    expect(orm.migrator[method]).toHaveBeenCalledOnce();
    expect(orm.close).toHaveBeenCalledWith(true);
  });

  it("closes the ORM when a migration fails", async () => {
    const orm = createOrm();
    const failure = new Error("migration failed");
    orm.migrator.up.mockRejectedValueOnce(failure);
    vi.mocked(MikroORM.init).mockResolvedValue(asMikroOrm(orm));

    await expect(runMigrations("up", environment)).rejects.toBe(failure);

    expect(orm.close).toHaveBeenCalledWith(true);
  });
});
