import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Building a launch walks the SDK's curve math; leave room on slow machines.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
