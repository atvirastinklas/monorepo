import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import worker from "../src";
import { syncRepeaters } from "../src/sync";

beforeEach(async () => {
  await env.MESHCORE_DB.exec("DELETE FROM repeater_neighbors; DELETE FROM repeaters;");
});

describe("MeshCore repeater API", () => {
  it("returns the four regions in repeater stats", async () => {
    await insertRepeater("aaaaaa000000", "VNO", "Alpha");
    await insertRepeater("bbbbbb000000", "KUN", "Beta");

    const response = await worker.fetch(
      new Request("https://api-mc.atvirastinklas.lt/v1/repeaters/stats"),
      env,
      createExecutionContext(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      regions: [
        { count: 1, location_iata: "VNO" },
        { count: 1, location_iata: "KUN" },
        { count: 0, location_iata: "SQQ" },
        { count: 0, location_iata: "PLQ" },
      ],
      total: 2,
    });
  });

  it("returns a compact cached list with conditional ETags", async () => {
    await insertRepeater("bbbbbb000000", "KUN", "Beta");
    await insertRepeater("aaaaaa000000", "VNO", "Alpha");
    await env.MESHCORE_DB.prepare("INSERT INTO repeater_neighbors VALUES (?, ?, ?, ?)")
      .bind("aaaaaa000000", "cccccc000000", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z")
      .run();

    const request = new Request("https://api-mc.atvirastinklas.lt/v1/repeaters");
    const response = await worker.fetch(request, env, createExecutionContext());

    expect(response.headers.get("cache-control")).toContain("max-age=900");
    expect(response.headers.get("etag")).toMatch(/^"[a-f0-9]{64}"$/);
    await expect(response.json()).resolves.toEqual([
      { id: "aaaaaa", lat: 54.7, lon: 25.2, name: "Alpha", neighbors: ["cccccc"] },
      { id: "bbbbbb", lat: 54.7, lon: 25.2, name: "Beta", neighbors: [] },
    ]);

    const conditional = await worker.fetch(
      new Request("https://api-mc.atvirastinklas.lt/v1/repeaters", {
        headers: { "if-none-match": response.headers.get("etag") ?? "" },
      }),
      env,
      createExecutionContext(),
    );
    expect(conditional.status).toBe(304);
  });

  it("does not run a manual sync without its bearer secret", async () => {
    const response = await worker.fetch(
      new Request("https://api-mc.atvirastinklas.lt/v1/repeaters/sync", { method: "POST" }),
      env,
      createExecutionContext(),
    );

    expect(response.status).toBe(401);
  });

  it("pages CoreScope nodes, builds undirected neighbors, and retains the good snapshot on failure", async () => {
    const fetchSnapshot: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("neighbor-graph")) {
        return Response.json({
          edges: [{ source: "aaaaaaaaaaaaaaaa", target: "bbbbbbbbbbbbbbbb" }],
        });
      }

      const offset = new URL(url).searchParams.get("offset");
      if (offset === "0") {
        return Response.json({
          nodes: [
            {
              first_seen: "2026-01-01T00:00:00Z",
              foreign: false,
              hash_size: 3,
              lat: 54.7,
              last_seen: "2026-01-02T00:00:00Z",
              lon: 25.2,
              name: "Alpha",
              public_key: "aaaaaaaaaaaaaaaa",
              role: "repeater",
            },
          ],
          total: 2,
        });
      }

      return Response.json({
        nodes: [
          {
            foreign: false,
            hash_size: 3,
            lat: 54.6,
            lon: 25.3,
            name: "Beta",
            public_key: "bbbbbbbbbbbbbbbb",
            role: "repeater",
          },
        ],
        total: 2,
      });
    };

    const result = await syncRepeaters(
      env.MESHCORE_DB,
      "https://meshcore.example",
      fetchSnapshot,
      new Date("2026-02-01T00:00:00Z"),
    );
    expect(result).toMatchObject({ fetched: 2, neighbors: 2, repeaters: 2 });

    const rows = await env.MESHCORE_DB.prepare(
      "SELECT source_hex_id, neighbor_hex_id FROM repeater_neighbors ORDER BY source_hex_id",
    ).all();
    expect(rows.results).toEqual([
      { neighbor_hex_id: "bbbbbbbbbbbbbbbb", source_hex_id: "aaaaaaaaaaaaaaaa" },
      { neighbor_hex_id: "aaaaaaaaaaaaaaaa", source_hex_id: "bbbbbbbbbbbbbbbb" },
    ]);

    await expect(
      syncRepeaters(
        env.MESHCORE_DB,
        "https://meshcore.example",
        fetchSnapshot,
        new Date("2026-02-02T00:00:00Z"),
      ),
    ).resolves.toMatchObject({ repeaters: 2 });

    await expect(
      syncRepeaters(
        env.MESHCORE_DB,
        "https://meshcore.example",
        async () => new Response("broken", { status: 502 }),
      ),
    ).rejects.toThrow("CoreScope request failed");
    const count = await env.MESHCORE_DB.prepare(
      "SELECT COUNT(*) AS count FROM repeaters",
    ).first<number>("count");
    expect(count).toBe(2);
  });
});

async function insertRepeater(hexId: string, locationIata: string, name: string): Promise<void> {
  await env.MESHCORE_DB.prepare(
    `INSERT INTO repeaters (
      location_iata, hex_id, network_id, name, lat, lon, last_heard, created_at, modified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      locationIata,
      hexId,
      hexId.slice(0, 6),
      name,
      54.7,
      25.2,
      null,
      null,
      "2026-01-01T00:00:00.000Z",
    )
    .run();
}

function createExecutionContext(): ExecutionContext {
  return {
    passThroughOnException() {},
    waitUntil() {},
  };
}
