import type { D1Database } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    MESHCORE_SYNC_SECRET?: string;
  }
}
