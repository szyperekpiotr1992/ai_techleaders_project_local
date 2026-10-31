import { execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { closeDatabase, createDatabase } from "@devmentor/db";

const appDirectory = resolve(process.cwd(), "packages/app");
const nextCli = resolve(process.cwd(), "node_modules/next/dist/bin/next");
const agentBrowserCli = resolve(
  process.cwd(),
  "node_modules/agent-browser/bin/agent-browser.js",
);

let postgres: StartedPostgreSqlContainer | undefined;
let database: Awaited<ReturnType<typeof createDatabase>> | undefined;
let appServer: ChildProcess | undefined;
let browserSessionStarted = false;
let appUrl: string;
let serverOutput = "";

function runAgentBrowser(...args: string[]): void {
  execFileSync(process.execPath, [agentBrowserCli, ...args], {
    stdio: "inherit",
    timeout: 60_000,
  });
}

async function getAvailablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not determine a free port for the application.");
  }
  const port = address.port;

  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()));
  });
  return port;
}

async function waitForAppReady(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    if (appServer?.exitCode !== null && appServer?.exitCode !== undefined) {
      throw new Error(
        `Next.js exited with code ${appServer.exitCode}.\n${serverOutput}`,
      );
    }

    try {
      const response = await fetch(appUrl);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Next.js returned HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }

  throw new Error(
    `Next.js did not become ready at ${appUrl}: ${String(lastError)}.\n${serverOutput}`,
  );
}

describe("temporary Next.js app with PostgreSQL", () => {
  beforeAll(async () => {
    postgres = await new PostgreSqlContainer("postgres:16-alpine").start();
    const environment = { DATABASE_URL: postgres.getConnectionUri() };
    database = await createDatabase(environment);

    const result = await database.em
      .getConnection()
      .execute<{ value: number }[]>("SELECT 1 AS value");
    expect(result[0]?.value).toBe(1);

    const port = await getAvailablePort();
    appUrl = `http://127.0.0.1:${port}`;
    appServer = spawn(
      process.execPath,
      [nextCli, "start", "--hostname", "127.0.0.1", "--port", String(port)],
      {
        cwd: appDirectory,
        env: {
          ...process.env,
          DATABASE_URL: environment.DATABASE_URL,
          HOSTNAME: "127.0.0.1",
          PORT: String(port),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    appServer.stdout?.on("data", (chunk: Buffer) => {
      serverOutput += chunk.toString();
    });
    appServer.stderr?.on("data", (chunk: Buffer) => {
      serverOutput += chunk.toString();
    });

    await waitForAppReady();
  }, 120_000);

  afterAll(async () => {
    appServer?.kill();
    if (database) {
      await closeDatabase(database);
    }
    if (postgres) {
      await postgres.stop();
    }
    if (browserSessionStarted) {
      runAgentBrowser("close");
    }
  });

  it("visits the running app in agent-browser and verifies its rendered page", () => {
    runAgentBrowser("open", appUrl);
    browserSessionStarted = true;
    runAgentBrowser("wait", "--load", "domcontentloaded");
    runAgentBrowser(
      "eval",
      "if (!document.body.innerText.includes('To get started, edit the') || !document.body.innerText.includes('Documentation')) throw new Error('The expected homepage content is missing')",
    );
  }, 60_000);
});
