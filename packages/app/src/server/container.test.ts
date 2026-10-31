import { afterEach, describe, expect, it, vi } from "vitest";
import { closeDatabase, createDatabase } from "@devmentor/db";
import { createApplicationContainer } from "./container";

vi.mock("@devmentor/db", () => ({
  closeDatabase: vi.fn(),
  createDatabase: vi.fn(),
}));

describe("createApplicationContainer", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers a lazy singleton database factory and disposes its connection", async () => {
    const connection = {} as Awaited<ReturnType<typeof createDatabase>>;
    const connectionPromise = Promise.resolve(connection);
    vi.mocked(createDatabase).mockReturnValue(connectionPromise);

    const container = createApplicationContainer();

    try {
      const factory = container.resolve("databaseFactory");
      expect(factory).toBe(createDatabase);
      expect(container.hasRegistration("databaseFactory")).toBe(true);
      expect(container.hasRegistration("database")).toBe(true);
      expect(createDatabase).not.toHaveBeenCalled();

      const firstResolution = container.resolve("database");
      const secondResolution = container.resolve("database");
      expect(firstResolution).toBe(secondResolution);
      expect(await firstResolution).toBe(connection);
      expect(createDatabase).toHaveBeenCalledOnce();
    } finally {
      await container.dispose();
    }

    expect(closeDatabase).toHaveBeenCalledWith(connection);
  });
});
