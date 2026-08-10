import { z } from "zod";

import { findMeshcoreIataRegion, type MeshcoreIataRegion } from "./regions";

const requiredString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1));

const nullableString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable());

const nullableFiniteNumber = z.preprocess((value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}, z.number().nullable());

const nullablePositiveInteger = z.preprocess((value) => {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  const integer = Math.trunc(number);
  return Number.isFinite(integer) && integer > 0 ? integer : null;
}, z.number().int().positive().nullable());

const nullableTimestamp = z.preprocess((value) => {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}, z.string().nullable());

export const coreScopeNodeSchema = z.object({
  public_key: requiredString,
  name: nullableString,
  role: requiredString,
  foreign: z.boolean().optional(),
  lat: nullableFiniteNumber,
  lon: nullableFiniteNumber,
  hash_size: nullablePositiveInteger,
  first_seen: nullableTimestamp,
  last_heard: nullableTimestamp,
  last_seen: nullableTimestamp,
});

export const coreScopeNodesResponseSchema = z.object({
  nodes: z.array(z.unknown()),
  total: z.number().int().nonnegative(),
});

export const coreScopeNeighborGraphSchema = z.object({
  edges: z.array(
    z.object({
      source: z.string().optional(),
      target: z.string().optional(),
    }),
  ),
});

export type CoreScopeNode = z.infer<typeof coreScopeNodeSchema>;

export type Repeater = {
  locationIata: MeshcoreIataRegion;
  hexId: string;
  networkId: string;
  name: string | null;
  lat: number;
  lon: number;
  lastHeard: string | null;
  createdAt: string | null;
};

export type RepeaterTopology = {
  repeaters: Repeater[];
  neighborsByRepeater: Map<string, string[]>;
};

export type RepeaterTopologyEdge = {
  source?: string;
  target?: string;
};

export function normalizeRepeater(value: unknown): Repeater | null {
  const parsed = coreScopeNodeSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  const node = parsed.data;
  if (
    node.role !== "repeater" ||
    node.foreign === true ||
    node.lat === null ||
    node.lon === null ||
    node.lat === 0 ||
    node.lon === 0 ||
    node.hash_size === null
  ) {
    return null;
  }

  const locationIata = findMeshcoreIataRegion(node.lon, node.lat);
  const hexId = normalizeHex(node.public_key);
  const networkId = deriveNetworkId(hexId, node.hash_size);
  if (locationIata === null || networkId === null) {
    return null;
  }

  return {
    locationIata,
    hexId,
    networkId,
    name: node.name,
    lat: node.lat,
    lon: node.lon,
    lastHeard: node.last_heard ?? node.last_seen,
    createdAt: node.first_seen,
  };
}

export function consolidateRepeaterTopology(
  rawNodes: readonly unknown[],
  rawGraph: unknown,
): RepeaterTopology {
  const graph = coreScopeNeighborGraphSchema.safeParse(rawGraph);
  if (!graph.success) {
    throw new Error("CoreScope neighbor graph response has no edges array");
  }

  const repeaters = rawNodes
    .map(normalizeRepeater)
    .filter((repeater): repeater is Repeater => repeater !== null)
    .sort((left, right) => left.hexId.localeCompare(right.hexId));

  return createRepeaterTopology(repeaters, graph.data.edges);
}

export function createRepeaterTopology(
  repeaters: readonly Repeater[],
  edges: readonly RepeaterTopologyEdge[],
): RepeaterTopology {
  const sortedRepeaters = [...repeaters].sort((left, right) => left.hexId.localeCompare(right.hexId));
  const neighbors = new Map<string, Set<string>>(
    sortedRepeaters.map((repeater) => [repeater.hexId, new Set<string>()]),
  );

  for (const edge of edges) {
    const source = normalizeNeighborId(edge.source);
    const target = normalizeNeighborId(edge.target);
    if (source === null || target === null) {
      continue;
    }

    neighbors.get(source)?.add(target);
    neighbors.get(target)?.add(source);
  }

  return {
    repeaters: sortedRepeaters,
    neighborsByRepeater: new Map(
      [...neighbors].map(([source, targets]) => [source, [...targets].sort()]),
    ),
  };
}

export function deriveNetworkId(hexId: string, hashSizeBytes: number): string | null {
  const length = hashSizeBytes * 2;
  return hexId.length >= length ? hexId.slice(0, length) : null;
}

export function compactId(hexId: string): string {
  return hexId.slice(0, 6);
}

function normalizeNeighborId(value: string | undefined): string | null {
  if (!value || value.startsWith("prefix:")) {
    return null;
  }

  const normalized = normalizeHex(value);
  return /^[a-f0-9]{6,}$/.test(normalized) ? normalized : null;
}

function normalizeHex(value: string): string {
  return value.toLowerCase();
}
