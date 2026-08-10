import {
  beaconNodeSchema,
  beaconNodesResponseSchema,
  createRepeaterTopology,
  consolidateRepeaterTopology,
  coreScopeNodesResponseSchema,
  normalizeBeaconRepeater,
  parseMeshcoreProvider,
  type BeaconNode,
  type MeshcoreProvider,
  type Repeater,
  type RepeaterTopologyEdge,
  type RepeaterTopology,
} from "@workspace/meshcore";
import { z } from "zod";

import { createDatabase, type Database, type RepeaterTable } from "./db";

const BEACON_PAGE_SIZE = 100;
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

type SyncOptions = {
  beaconBaseUrl?: string;
  coreScopeBaseUrl?: string;
  fetchFn?: typeof fetch;
  now?: Date;
  provider?: string;
};

export async function syncRepeaters(
  database: D1Database,
  {
    beaconBaseUrl,
    coreScopeBaseUrl,
    fetchFn = fetch,
    now = new Date(),
    provider: providerValue,
  }: SyncOptions = {},
): Promise<SyncResult> {
  const provider = parseMeshcoreProvider(providerValue);
  const { fetched, topology } =
    provider === "beacon"
      ? await fetchBeaconTopology(requiredBaseUrl(beaconBaseUrl, provider), fetchFn)
      : await fetchCoreScopeTopology(
          requiredBaseUrl(coreScopeBaseUrl, provider),
          fetchFn,
        );
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
    fetched,
    neighbors: countNeighbors(topology),
    removed:
      Number(deletedRepeaters?.numDeletedRows ?? 0) + Number(deletedNeighbors?.numDeletedRows ?? 0),
    repeaters: topology.repeaters.length,
    syncedAt,
  };
}

async function fetchCoreScopeTopology(
  baseUrl: string,
  fetchFn: typeof fetch,
): Promise<{ fetched: number; topology: RepeaterTopology }> {
  const [nodes, graph] = await Promise.all([
    fetchAllCoreScopeNodes(baseUrl, fetchFn),
    fetchJson(
      `${trimTrailingSlash(baseUrl)}/api/analytics/neighbor-graph?min_count=1&min_score=0`,
      fetchFn,
    ),
  ]);

  return {
    fetched: nodes.length,
    topology: consolidateRepeaterTopology(nodes, graph),
  };
}

async function fetchAllCoreScopeNodes(
  baseUrl: string,
  fetchFn: typeof fetch,
): Promise<unknown[]> {
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

async function fetchBeaconTopology(
  baseUrl: string,
  fetchFn: typeof fetch,
): Promise<{ fetched: number; topology: RepeaterTopology }> {
  const nodes = await fetchAllBeaconNodes(baseUrl, fetchFn);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const repeaters = nodes
    .map(normalizeBeaconRepeater)
    .filter((repeater): repeater is Repeater => repeater !== null);
  const edges: RepeaterTopologyEdge[] = [];

  for (const node of nodes) {
    const source = node.publicKey.toLowerCase();
    for (const neighborId of node.neighborIds) {
      const neighbor = nodesById.get(neighborId);
      if (neighbor) {
        edges.push({ source, target: neighbor.publicKey.toLowerCase() });
      }
    }
  }

  return {
    fetched: nodes.length,
    topology: createRepeaterTopology(repeaters, edges),
  };
}

async function fetchAllBeaconNodes(baseUrl: string, fetchFn: typeof fetch) {
  const nodes: BeaconNode[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  while (true) {
    const url = new URL("/api/v1/nodes", trimTrailingSlash(baseUrl));
    url.searchParams.set("limit", String(BEACON_PAGE_SIZE));
    url.searchParams.set("neighbors", "true");
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const payload = await fetchJson(url.toString(), fetchFn);
    const response = beaconNodesResponseSchema.safeParse(payload);
    if (!response.success) {
      throw new Error("Beacon nodes response is invalid");
    }

    for (const item of response.data.items) {
      const node = beaconNodeSchema.safeParse(item);
      if (!node.success) {
        throw new Error("Beacon nodes response contains an invalid node");
      }

      nodes.push(node.data);
    }

    if (!response.data.hasMore) {
      return nodes;
    }

    if (response.data.nextCursor === null || response.data.nextCursor === undefined) {
      throw new Error("Beacon nodes response is missing its next cursor");
    }

    cursor = String(response.data.nextCursor);
    if (seenCursors.has(cursor)) {
      throw new Error("Beacon nodes response returned a repeated cursor");
    }

    seenCursors.add(cursor);
  }
}

async function fetchJson(
  url: string,
  fetchFn: typeof fetch,
  headers: HeadersInit = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetchFn(url, {
      headers: {
        accept: "application/json",
        ...headers,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`MeshCore provider request failed with ${response.status}: ${url}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function requiredBaseUrl(value: string | undefined, provider: MeshcoreProvider): string {
  if (!value) {
    throw new Error(`Missing ${provider} provider base URL`);
  }

  return value;
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
