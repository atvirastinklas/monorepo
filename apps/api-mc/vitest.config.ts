import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));

  return {
    plugins: [
      cloudflareTest({
        miniflare: {
          bindings: {
            SYNC_API_KEY: "test-secret",
            TEST_MIGRATIONS: migrations,
          },
        },
        wrangler: {
          configPath: "./wrangler.jsonc",
        },
      }),
    ],
    test: {
      setupFiles: ["./test/apply-migrations.ts"],
    },
  };
});
