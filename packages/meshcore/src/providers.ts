import { z } from "zod";

import { compactId, type Repeater } from "./topology";
import { findMeshcoreIataRegion } from "./regions";

export const MESHCORE_PROVIDERS = ["beacon", "corescope"] as const;

export type MeshcoreProvider = (typeof MESHCORE_PROVIDERS)[number];

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

  return null;
}, z.number().nullable());

const nullableEpochMilliseconds = z.preprocess((value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}, z.string().nullable());

export const beaconNodeSchema = z.object({
  id: requiredString,
  publicKey: requiredString,
  nodeTypeName: requiredString,
  name: nullableString,
  lat: nullableFiniteNumber,
  lng: nullableFiniteNumber,
  firstSeen: nullableEpochMilliseconds.optional(),
  lastSeen: nullableEpochMilliseconds.optional(),
  neighborIds: z.array(requiredString).optional().default([]),
});

export const beaconNodesResponseSchema = z.object({
  hasMore: z.boolean(),
  items: z.array(z.unknown()),
  nextCursor: z.union([z.number(), z.string()]).nullable().optional(),
});

export type BeaconNode = z.infer<typeof beaconNodeSchema>;

export function parseMeshcoreProvider(value: string | undefined): MeshcoreProvider {
  if (value === undefined || value.trim() === "") {
    return "beacon";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "beacon" || normalized === "corescope") {
    return normalized;
  }

  throw new Error(`Unsupported MeshCore provider: ${value}`);
}

export function normalizeBeaconRepeater(value: unknown): Repeater | null {
  const parsed = beaconNodeSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  const node = parsed.data;
  if (
    node.nodeTypeName.toLowerCase() !== "repeater" ||
    node.lat === null ||
    node.lng === null ||
    node.lat === 0 ||
    node.lng === 0
  ) {
    return null;
  }

  const locationIata = findMeshcoreIataRegion(node.lng, node.lat);
  if (locationIata === null) {
    return null;
  }

  const hexId = node.publicKey.toLowerCase();
  if (!/^[a-f0-9]{6,}$/.test(hexId)) {
    return null;
  }

  return {
    locationIata,
    hexId,
    networkId: compactId(hexId),
    name: node.name,
    lat: node.lat,
    lon: node.lng,
    lastHeard: node.lastSeen ?? null,
    createdAt: node.firstSeen ?? null,
  };
}
