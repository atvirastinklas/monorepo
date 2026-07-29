import {
  consolidateRepeaterTopology,
  coreScopeNodesResponseSchema,
  type RepeaterTopology,
} from "@workspace/meshcore";
import { z } from "zod";

import { createDatabase, type Database, type RepeaterTable } from "./db";

const CORESCOPE_PAGE_SIZE = 500;
const FETCH_TIMEOUT_MS = 15_000;

const jsonResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  nodes: z.array(z.unknown()),
});

export type SyncResult = {
  fetched: number;
  neighbors: number;
  removed: number;
  repeaters: number;
  syncedAt: string;
};

export async function syncRepeaters(
  database: D1Database,
  baseUrl: string,
  fetchFn: typeof fetch = fetch,
  now = new Date(),
): Promise<SyncResult> {
  const [nodes, graph] = await Promise.all([
    fetchAllNodes(baseUrl, fetchFn),
    fetchJson(
      `${trimTrailingSlash(baseUrl)}/api/analytics/neighbor-graph?min_count=1&min_score=0`,
      fetchFn,
    ),
  ]);

  const topology = consolidateRepeaterTopology(nodes, graph);
  const syncedAt = now.toISOString();
  const db = createDatabase(database);

  await persistTopology(db, topology, syncedAt);

  const deletedNeighbors = await db
    .deleteFrom("repeater_neighbors")
    .where("last_observed_at", "<", syncedAt)
    .executeTakeFirst();
  const deletedRepeaters = await db
    .deleteFrom("repeaters")
    .where("modified_at", "<", syncedAt)
    .executeTakeFirst();

  return {
    fetched: nodes.length,
    neighbors: countNeighbors(topology),
    removed:
      Number(deletedRepeaters?.numDeletedRows ?? 0) + Number(deletedNeighbors?.numDeletedRows ?? 0),
    repeaters: topology.repeaters.length,
    syncedAt,
  };
}

async function fetchAllNodes(baseUrl: string, fetchFn: typeof fetch): Promise<unknown[]> {
  const nodes: unknown[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const url = new URL("/api/nodes", trimTrailingSlash(baseUrl));
    url.searchParams.set("role", "repeater");
    url.searchParams.set("limit", String(CORESCOPE_PAGE_SIZE));
    url.searchParams.set("offset", String(offset));

    const payload = await fetchJson(url.toString(), fetchFn);
    const response = jsonResponseSchema.safeParse(payload);
    const contract = coreScopeNodesResponseSchema.safeParse(payload);
    if (!response.success || !contract.success) {
      throw new Error("CoreScope nodes response is invalid");
    }

    nodes.push(...response.data.nodes);
    total = response.data.total;

    if (response.data.nodes.length === 0) {
      break;
    }

    offset += response.data.nodes.length;
  }

  return nodes;
}

async function fetchJson(url: string, fetchFn: typeof fetch): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetchFn(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`CoreScope request failed with ${response.status}: ${url}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function persistTopology(
  db: ReturnType<typeof createDatabase>,
  topology: RepeaterTopology,
  syncedAt: string,
): Promise<void> {
  for (const repeater of topology.repeaters) {
    const row: RepeaterTable = {
      location_iata: repeater.locationIata,
      hex_id: repeater.hexId,
      network_id: repeater.networkId,
      name: repeater.name,
      lat: repeater.lat,
      lon: repeater.lon,
      last_heard: repeater.lastHeard,
      created_at: repeater.createdAt,
      modified_at: syncedAt,
    };

    await db
      .insertInto("repeaters")
      .values(row)
      .onConflict((conflict) =>
        conflict
          .column("hex_id")
          .doUpdateSet(row)
          .whereRef("excluded.modified_at", ">", "repeaters.modified_at"),
      )
      .execute();
  }

  for (const [source, neighbors] of topology.neighborsByRepeater) {
    for (const neighbor of neighbors) {
      await db
        .insertInto("repeater_neighbors")
        .values({
          source_hex_id: source,
          neighbor_hex_id: neighbor,
          first_observed_at: syncedAt,
          last_observed_at: syncedAt,
        })
        .onConflict((conflict) =>
          conflict.columns(["source_hex_id", "neighbor_hex_id"]).doUpdateSet({
            last_observed_at: syncedAt,
          }),
        )
        .execute();
    }
  }
}

function countNeighbors(topology: RepeaterTopology): number {
  return [...topology.neighborsByRepeater.values()].reduce(
    (count, neighbors) => count + neighbors.length,
    0,
  );
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
