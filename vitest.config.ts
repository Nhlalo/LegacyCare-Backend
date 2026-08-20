import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,

    setupFiles:
      process.env.TEST_TYPE === "integration"
        ? ["./vitest.setup.ts", "./vitest.integration.setup.ts"]
        : ["./vitest.setup.ts", "./vitest.unit.setup.ts"],

    include: [
      "src/**/__tests__/**/*.test.ts",
      "tests/integration/**/*.test.ts",
      "tests/e2e/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**"],

    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.d.ts",
        "tests/**",
        "vitest.*.ts",
      ],
    },

    testTimeout: process.env.TEST_TYPE === "integration" ? 30000 : 10000,

    env: {
      NODE_ENV: "test",
    },
  },
});
