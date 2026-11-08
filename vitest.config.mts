import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    css: false,
    coverage: {
      provider: "v8",
      include: [
        "packages/app/app/**/*.tsx",
        "packages/app/src/**/*.ts",
        "packages/db/src/**/*.ts",
        "scripts/setup.mjs",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "scripts/**/*.test.ts",
        "packages/db/src/cli-entry.ts",
        "packages/db/src/index.ts",
      ],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
