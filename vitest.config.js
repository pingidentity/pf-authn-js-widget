import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "./test/coverage",
      reporter: ["text", "html", "lcov"],
    },
  },
});
