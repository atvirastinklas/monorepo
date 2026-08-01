import type { D1Database, DurableObjectNamespace } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    GEOCODE_COORDINATOR: DurableObjectNamespace;
    MESHCORE_SYNC_SECRET?: string;
  }
}
