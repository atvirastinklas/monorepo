import { compactId, MESHCORE_IATA_REGIONS } from "@workspace/meshcore";

import { createDatabase } from "./db";
import { syncRepeaters } from "./sync";

type SyncEnv = Env & { SYNC_API_KEY?: string };

const JSON_HEADERS = {
  "access-control-allow-origin": "*",
  "content-type": "application/json; charset=utf-8",
};

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-headers": "authorization, content-type",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-origin": "*",
          "access-control-max-age": "86400",
        },
      });
    }

    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/v1/repeaters/stats") {
        return await getStatsResponse(env);
      }

      if (request.method === "GET" && url.pathname === "/v1/repeaters") {
        return await getRepeatersResponse(request, env);
      }

      if (request.method === "POST" && url.pathname === "/v1/repeaters/sync") {
        if (!isAuthorized(request, env.SYNC_API_KEY)) {
          return json({ error: "Unauthorized" }, 401);
        }

        const result = await syncRepeaters(env.MESHCORE_DB, env.CORESCOPE_BASE_URL);
        console.info(JSON.stringify({ event: "repeaters.sync.succeeded", ...result }));
        return json(result, 200, { "cache-control": "no-store" });
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
          event: "request.failed",
          method: request.method,
          path: url.pathname,
        }),
      );
      return json({ error: "Internal server error" }, 500, { "cache-control": "no-store" });
    }
  },

  async scheduled(controller, env): Promise<void> {
    try {
      const result = await syncRepeaters(env.MESHCORE_DB, env.CORESCOPE_BASE_URL);
      console.info(
        JSON.stringify({
          cron: controller.cron,
          event: "repeaters.sync.succeeded",
          scheduledTime: controller.scheduledTime,
          ...result,
        }),
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          cron: controller.cron,
          error: error instanceof Error ? error.message : "Unknown error",
          event: "repeaters.sync.failed",
          scheduledTime: controller.scheduledTime,
        }),
      );
      throw error;
    }
  },
} satisfies ExportedHandler<SyncEnv>;

async function getStatsResponse(env: SyncEnv): Promise<Response> {
  const db = createDatabase(env.MESHCORE_DB);
  const rows = await db
    .selectFrom("repeaters")
    .select((expression) => ["location_iata", expression.fn.countAll<number>().as("count")])
    .groupBy("location_iata")
    .execute();
  const counts = new Map(rows.map((row) => [row.location_iata, Number(row.count)]));
  const regions = MESHCORE_IATA_REGIONS.map((location_iata) => ({
    count: counts.get(location_iata) ?? 0,
    location_iata,
  }));

  return json(
    {
      regions,
      total: regions.reduce((total, region) => total + region.count, 0),
    },
    200,
  );
}

async function getRepeatersResponse(request: Request, env: SyncEnv): Promise<Response> {
  const db = createDatabase(env.MESHCORE_DB);
  const [repeaters, neighborRows] = await Promise.all([
    db.selectFrom("repeaters").selectAll().orderBy("name").orderBy("hex_id").execute(),
    db
      .selectFrom("repeater_neighbors")
      .select(["source_hex_id", "neighbor_hex_id"])
      .orderBy("neighbor_hex_id")
      .execute(),
  ]);
  const neighbors = new Map<string, string[]>();
  for (const row of neighborRows) {
    const sourceNeighbors = neighbors.get(row.source_hex_id) ?? [];
    sourceNeighbors.push(compactId(row.neighbor_hex_id));
    neighbors.set(row.source_hex_id, sourceNeighbors);
  }

  const payload = repeaters.map((repeater) => ({
    id: compactId(repeater.hex_id),
    lat: repeater.lat,
    lon: repeater.lon,
    name: repeater.name,
    neighbors: [...new Set(neighbors.get(repeater.hex_id) ?? [])].sort(),
  }));
  const body = JSON.stringify(payload);
  const etag = `"${await sha256(body)}"`;
  const lastModified = repeaters.reduce<string | null>(
    (latest, repeater) =>
      latest === null || repeater.modified_at > latest ? repeater.modified_at : latest,
    null,
  );

  if (isNotModified(request, etag, lastModified)) {
    return new Response(null, {
      status: 304,
      headers: cacheHeaders(etag, lastModified),
    });
  }

  return new Response(body, {
    headers: {
      ...JSON_HEADERS,
      ...cacheHeaders(etag, lastModified),
    },
  });
}

function isAuthorized(request: Request, expectedSecret: string | undefined): boolean {
  if (!expectedSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  return timingSafeEqual(authorization.slice("Bearer ".length), expectedSecret);
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return difference === 0;
}

function isNotModified(request: Request, etag: string, lastModified: string | null): boolean {
  if (request.headers.get("if-none-match") === etag) {
    return true;
  }

  const ifModifiedSince = request.headers.get("if-modified-since");
  return (
    lastModified !== null &&
    ifModifiedSince !== null &&
    Number.isFinite(Date.parse(ifModifiedSince)) &&
    Date.parse(lastModified) <= Date.parse(ifModifiedSince)
  );
}

function cacheHeaders(etag: string, lastModified: string | null): HeadersInit {
  return {
    "cache-control": "public, max-age=900, stale-while-revalidate=900",
    etag,
    ...(lastModified ? { "last-modified": new Date(lastModified).toUTCString() } : {}),
  };
}

function json(payload: unknown, status: number, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    headers: { ...JSON_HEADERS, ...headers },
    status,
  });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
