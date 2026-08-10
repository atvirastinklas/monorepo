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

  it("pages CoreScope nodes and retains the good snapshot on failure", async () => {
    const fetchSnapshot: typeof fetch = async (input, init) => {
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

    const result = await syncRepeaters(env.MESHCORE_DB, {
      coreScopeBaseUrl: "https://meshcore.example",
      fetchFn: fetchSnapshot,
      now: new Date("2026-02-01T00:00:00Z"),
      provider: "corescope",
    });
    expect(result).toMatchObject({ fetched: 2, neighbors: 2, repeaters: 2 });

    const rows = await env.MESHCORE_DB.prepare(
      "SELECT source_hex_id, neighbor_hex_id FROM repeater_neighbors ORDER BY source_hex_id",
    ).all();
    expect(rows.results).toEqual([
      { neighbor_hex_id: "bbbbbbbbbbbbbbbb", source_hex_id: "aaaaaaaaaaaaaaaa" },
      { neighbor_hex_id: "aaaaaaaaaaaaaaaa", source_hex_id: "bbbbbbbbbbbbbbbb" },
    ]);

    await expect(
      syncRepeaters(env.MESHCORE_DB, {
        coreScopeBaseUrl: "https://meshcore.example",
        fetchFn: fetchSnapshot,
        now: new Date("2026-02-02T00:00:00Z"),
        provider: "corescope",
      }),
    ).resolves.toMatchObject({ repeaters: 2 });

    await expect(
      syncRepeaters(env.MESHCORE_DB, {
        coreScopeBaseUrl: "https://meshcore.example",
        fetchFn: async () => new Response("broken", { status: 502 }),
        provider: "corescope",
      }),
    ).rejects.toThrow("MeshCore provider request failed");
    const count = await env.MESHCORE_DB.prepare(
      "SELECT COUNT(*) AS count FROM repeaters",
    ).first<number>("count");
    expect(count).toBe(2);
  });

  it("uses Beacon by default and resolves UUID neighbors", async () => {
    const requests: URL[] = [];
    const fetchSnapshot: typeof fetch = async (input) => {
      const url = new URL(String(input));
      requests.push(url);

      if (!url.searchParams.get("cursor")) {
        return Response.json({
          hasMore: true,
          items: [
            beaconNode({
              id: "node-alpha",
              neighborIds: ["node-external"],
              publicKey: "aaaaaaaaaaaaaaaa",
            }),
            beaconNode({
              id: "node-external",
              lat: 52.5,
              lng: 13.4,
              nodeTypeName: "companion",
              publicKey: "bbbbbbbbbbbbbbbb",
            }),
          ],
          nextCursor: "page-two",
        });
      }

      return Response.json({
        hasMore: false,
        items: [
          beaconNode({
            id: "node-beta",
            lat: 54.6,
            lng: 25.3,
            neighborIds: ["node-alpha"],
            publicKey: "cccccccccccccccc",
          }),
        ],
      });
    };

    const result = await syncRepeaters(env.MESHCORE_DB, {
      beaconBaseUrl: "https://beacon.example",
      fetchFn: fetchSnapshot,
      now: new Date("2026-02-01T00:00:00Z"),
    });

    expect(result).toMatchObject({ fetched: 3, neighbors: 3, repeaters: 2 });
    expect(requests).toHaveLength(2);
    expect(requests[0]?.pathname).toBe("/api/v1/nodes");
    expect(requests[0]?.searchParams.get("neighbors")).toBe("true");
    expect(requests[1]?.searchParams.get("cursor")).toBe("page-two");

    const rows = await env.MESHCORE_DB.prepare(
      "SELECT hex_id, network_id FROM repeaters ORDER BY hex_id",
    ).all();
    expect(rows.results).toEqual([
      {
        hex_id: "aaaaaaaaaaaaaaaa",
        network_id: "aaaaaa",
      },
      {
        hex_id: "cccccccccccccccc",
        network_id: "cccccc",
      },
    ]);
  });

  it("rejects an invalid provider before deleting the current snapshot", async () => {
    await insertRepeater("aaaaaa000000", "VNO", "Alpha");

    await expect(
      syncRepeaters(env.MESHCORE_DB, {
        beaconBaseUrl: "https://beacon.example",
        provider: "unknown",
      }),
    ).rejects.toThrow("Unsupported MeshCore provider");

    const count = await env.MESHCORE_DB.prepare(
      "SELECT COUNT(*) AS count FROM repeaters",
    ).first<number>("count");
    expect(count).toBe(1);
  });
});

function beaconNode(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    firstSeen: 1_767_225_600_000,
    id: "node",
    lastSeen: 1_767_312_000_000,
    lat: 54.7,
    lng: 25.2,
    name: "Beacon repeater",
    neighborIds: [],
    nodeTypeName: "repeater",
    publicKey: "dddddddddddddddd",
    ...overrides,
  };
}

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
