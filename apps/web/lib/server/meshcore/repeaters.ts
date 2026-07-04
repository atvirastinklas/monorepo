import type { D1Database } from "@cloudflare/workers-types";
import bboxPolygon from "@turf/bbox-polygon";
import booleanIntersects from "@turf/boolean-intersects";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type { Insertable, Kysely, Selectable } from "kysely";
import { z } from "zod";

import {
  isMeshcoreIataRegion,
  MESHCORE_IATA_REGIONS,
  type MeshcoreIataRegion,
} from "../../meshcore/regions";
import { createDatabase, type Database, type MeshcoreRepeaterTable } from "../db";
import meshcoreRegionsGeoJson from "./assets/lithuania.json";

const MESHCORE_FETCH_TIMEOUT_MS = 10_000;
const MESHCORE_CORESCOPE_NODES_URL = "https://meshcore.atvirastinklas.lt/api/nodes?limit=5000";

type GeoJsonPosition = [number, number, ...number[]];
type GeoJsonLinearRing = GeoJsonPosition[];
type GeoJsonPolygonCoordinates = GeoJsonLinearRing[];
type GeoJsonMultiPolygonCoordinates = GeoJsonPolygonCoordinates[];
type GeoJsonBoundingBox = [number, number, number, number];

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

interface GeoJsonFeature<G extends GeoJsonGeometry | null = GeoJsonGeometry | null> {
  type: "Feature";
  geometry: G;
  properties: Record<string, unknown> | null;
}

type GeoJsonPointGeometry = {
  type: "Point";
  coordinates: GeoJsonPosition;
};

type GeoJsonPolygonGeometry = {
  type: "Polygon";
  coordinates: GeoJsonPolygonCoordinates;
};

type GeoJsonMultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: GeoJsonMultiPolygonCoordinates;
};

type GeoJsonBoundaryGeometry = GeoJsonPolygonGeometry | GeoJsonMultiPolygonGeometry;
type GeoJsonGeometry = GeoJsonPointGeometry | GeoJsonBoundaryGeometry;
type GeoJsonBoundaryFeature = GeoJsonFeature<GeoJsonBoundaryGeometry>;
type GeoJsonPointFeature = GeoJsonFeature<GeoJsonPointGeometry>;

interface MeshcoreRegionFeature {
  iata: MeshcoreIataRegion;
  feature: GeoJsonBoundaryFeature;
  boundsPolygon: ReturnType<typeof bboxPolygon>;
}

const MESHCORE_REGION_GEO_JSON_SOURCE: unknown = meshcoreRegionsGeoJson;
const MESHCORE_REGION_FEATURES = extractMeshcoreRegionFeatures(
  MESHCORE_REGION_GEO_JSON_SOURCE as GeoJsonFeatureCollection,
);

const requiredStringSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1));

const nullableNumberSchema = z.preprocess(
  (value) => coerceFiniteNumber(value),
  z.number().nullable(),
);

const nullableUnixSecondsFromIsoSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
}, z.number().nullable());

const nullablePositiveIntegerSchema = z.preprocess((value) => {
  const number = coerceFiniteNumber(value);

  if (number === null) {
    return null;
  }

  const truncated = Math.trunc(number);
  return truncated > 0 ? truncated : null;
}, z.number().int().positive().nullable());

const coreScopeNodeListSchema = z.array(z.unknown());

const coreScopeNodeSchema = z.object({
  public_key: requiredStringSchema,
  name: requiredStringSchema,
  role: requiredStringSchema,
  foreign: z.boolean().optional(),
  lat: nullableNumberSchema,
  lon: nullableNumberSchema,
  hash_size: nullablePositiveIntegerSchema,
  first_seen: nullableUnixSecondsFromIsoSchema,
  last_heard: nullableUnixSecondsFromIsoSchema,
  last_seen: nullableUnixSecondsFromIsoSchema,
});

export type MeshcoreRepeater = Selectable<MeshcoreRepeaterTable>;

export interface ListMeshcoreRepeatersOptions {
  iata?: MeshcoreIataRegion;
}

export interface ListMeshcoreRepeatersResult {
  repeaters: MeshcoreRepeater[];
  recordedAtMax: number | null;
}

export interface MeshcoreRepeaterRegionStat {
  iata: MeshcoreIataRegion;
  count: number;
}

export interface MeshcoreRepeaterStats {
  regions: MeshcoreRepeaterRegionStat[];
  total: number;
}

export interface SyncMeshcoreRegionResult {
  iata: MeshcoreIataRegion;
  upserted: number;
}

export interface SyncMeshcoreRepeatersResult {
  recordedAt: number;
  fetched: number;
  upserted: number;
  skipped: number;
  removed: number;
  regions: SyncMeshcoreRegionResult[];
}

export async function listMeshcoreRepeaters(
  database: D1Database,
  options: ListMeshcoreRepeatersOptions = {},
): Promise<ListMeshcoreRepeatersResult> {
  const db = createDatabase(database);
  let query = db.selectFrom("meshcore_repeaters").selectAll();

  if (options.iata) {
    query = query.where("iata", "=", options.iata);
  }

  const repeaters = await query.orderBy("iata").orderBy("name").execute();
  const recordedAtMax = repeaters.reduce<number | null>((max, repeater) => {
    if (max === null || repeater.recorded_at > max) {
      return repeater.recorded_at;
    }

    return max;
  }, null);

  return { repeaters, recordedAtMax };
}

export async function getMeshcoreRepeaterStats(
  database: D1Database,
): Promise<MeshcoreRepeaterStats> {
  const db = createDatabase(database);
  const rows = await db
    .selectFrom("meshcore_repeaters")
    .select((eb) => ["iata", eb.fn.countAll<number>().as("count")])
    .groupBy("iata")
    .execute();

  const countsByIata = new Map<string, number>(rows.map((row) => [row.iata, Number(row.count)]));

  const regions = MESHCORE_IATA_REGIONS.map((iata) => ({
    iata,
    count: countsByIata.get(iata) ?? 0,
  }));

  const total = regions.reduce((sum, region) => sum + region.count, 0);

  return { regions, total };
}

export async function syncMeshcoreRepeaters(
  database: D1Database,
  options: {
    now?: Date;
  } = {},
): Promise<SyncMeshcoreRepeatersResult> {
  const db = createDatabase(database);
  const recordedAt = toUnixSeconds(options.now ?? new Date());
  const rawNodes = await fetchCoreScopeNodes();

  const regionCounts = new Map<MeshcoreIataRegion, number>();
  const rows: Insertable<MeshcoreRepeaterTable>[] = [];
  let skipped = 0;

  for (const rawNode of rawNodes) {
    const row = normalizeCoreScopeRepeater(rawNode, recordedAt);

    if (row === null) {
      skipped += 1;
      continue;
    }

    rows.push(row);
    const iata = row.iata as MeshcoreIataRegion;
    regionCounts.set(iata, (regionCounts.get(iata) ?? 0) + 1);
  }

  for (const row of rows) {
    await upsertMeshcoreRepeater(db, row);
  }

  const removed = await deleteStaleMeshcoreRepeaters(db, recordedAt);

  return {
    recordedAt,
    fetched: rawNodes.length,
    upserted: rows.length,
    skipped,
    removed,
    regions: MESHCORE_IATA_REGIONS.map((iata) => ({
      iata,
      upserted: regionCounts.get(iata) ?? 0,
    })),
  };
}

async function fetchCoreScopeNodes(): Promise<unknown[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MESHCORE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(MESHCORE_CORESCOPE_NODES_URL, {
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`CoreScope nodes request returned ${response.status}`);
    }

    const payload = (await response.json()) as unknown as { nodes: unknown[] };
    const result = coreScopeNodeListSchema.safeParse(payload.nodes);

    if (!result.success) {
      throw new Error("CoreScope nodes response was not an array");
    }

    return result.data;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeCoreScopeRepeater(
  value: unknown,
  recordedAt: number,
): Insertable<MeshcoreRepeaterTable> | null {
  const result = coreScopeNodeSchema.safeParse(value);

  if (!result.success) {
    return null;
  }

  const node = result.data;

  if (node.role !== "repeater" || node.foreign !== false) {
    return null;
  }

  if (node.lat === null || node.lon === null) {
    return null;
  }

  const iata = findMeshcoreIataRegion(node.lon, node.lat);

  if (iata === null) {
    return null;
  }

  if (node.hash_size === null) {
    return null;
  }

  const hexId = derivePublicKeyHexId(node.public_key, node.hash_size);

  if (hexId === null) {
    return null;
  }

  return {
    iata,
    id: hexId,
    hex_id: node.public_key,
    name: node.name,
    lat: node.lat,
    lon: node.lon,
    last_heard: node.last_heard ?? node.last_seen,
    created_at: node.first_seen,
    enabled: 1,
    power: null,
    hop_bytes: null,
    recorded_at: recordedAt,
    updated_at: recordedAt,
  };
}

async function upsertMeshcoreRepeater(
  db: Kysely<Database>,
  row: Insertable<MeshcoreRepeaterTable>,
) {
  await db
    .insertInto("meshcore_repeaters")
    .values(row)
    .onConflict((oc) =>
      oc.columns(["iata", "hex_id"]).doUpdateSet({
        id: row.id,
        name: row.name,
        lat: row.lat,
        lon: row.lon,
        last_heard: row.last_heard,
        created_at: row.created_at,
        enabled: row.enabled,
        power: row.power,
        hop_bytes: row.hop_bytes,
        recorded_at: row.recorded_at,
        updated_at: row.updated_at,
      }),
    )
    .execute();
}

async function deleteStaleMeshcoreRepeaters(db: Kysely<Database>, recordedAt: number) {
  const result = await db
    .deleteFrom("meshcore_repeaters")
    .where("recorded_at", "<", recordedAt)
    .executeTakeFirst();

  return result ? Number(result.numDeletedRows) : 0;
}

function toUnixSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

// CoreScope identifies nodes on-air by the leading `hash_size` bytes of their
// public key, not the full key, so the DB id must be truncated the same way.
function derivePublicKeyHexId(publicKeyHex: string, hashSizeBytes: number): string | null {
  const hexLength = hashSizeBytes * 2;

  if (publicKeyHex.length < hexLength) {
    return null;
  }

  return publicKeyHex.slice(0, hexLength).toLowerCase();
}

function findMeshcoreIataRegion(
  longitude: number | null | undefined,
  latitude: number | null | undefined,
): MeshcoreIataRegion | null {
  if (
    longitude === null ||
    longitude === undefined ||
    latitude === null ||
    latitude === undefined ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    return null;
  }

  const point = createPointFeature(longitude, latitude);

  for (const region of MESHCORE_REGION_FEATURES) {
    if (!booleanIntersects(point, region.boundsPolygon)) {
      continue;
    }

    if (booleanPointInPolygon(point, region.feature)) {
      return region.iata;
    }
  }

  return null;
}

function createPointFeature(longitude: number, latitude: number): GeoJsonPointFeature {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [longitude, latitude],
    },
    properties: null,
  };
}

function extractMeshcoreRegionFeatures(
  geoJson: GeoJsonFeatureCollection,
): MeshcoreRegionFeature[] {
  const regionFeatures: MeshcoreRegionFeature[] = [];

  for (const feature of geoJson.features) {
    const { geometry, properties } = feature;

    if (geometry === null || geometry.type === "Point") {
      continue;
    }

    const iataCode = properties?.iata_code;

    if (typeof iataCode !== "string" || !isMeshcoreIataRegion(iataCode)) {
      continue;
    }

    const boundaryFeature: GeoJsonBoundaryFeature = {
      type: "Feature",
      geometry,
      properties,
    };

    regionFeatures.push({
      iata: iataCode,
      feature: boundaryFeature,
      boundsPolygon: bboxPolygon(calculateCoordinateBounds([boundaryFeature])),
    });
  }

  if (regionFeatures.length === 0) {
    throw new Error("MeshCore region GeoJSON does not contain any IATA region polygons");
  }

  const missingRegions = MESHCORE_IATA_REGIONS.filter(
    (iata) => !regionFeatures.some((region) => region.iata === iata),
  );

  if (missingRegions.length > 0) {
    throw new Error(`MeshCore region GeoJSON is missing polygons for: ${missingRegions.join(", ")}`);
  }

  return regionFeatures;
}

function calculateCoordinateBounds(features: readonly GeoJsonBoundaryFeature[]): GeoJsonBoundingBox {
  const bounds = {
    minLongitude: Number.POSITIVE_INFINITY,
    minLatitude: Number.POSITIVE_INFINITY,
    maxLongitude: Number.NEGATIVE_INFINITY,
    maxLatitude: Number.NEGATIVE_INFINITY,
  };

  for (const feature of features) {
    const { geometry } = feature;

    if (geometry === null) {
      continue;
    }

    const polygons =
      geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (const [longitude, latitude] of ring) {
          if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
            continue;
          }

          bounds.minLongitude = Math.min(bounds.minLongitude, longitude);
          bounds.minLatitude = Math.min(bounds.minLatitude, latitude);
          bounds.maxLongitude = Math.max(bounds.maxLongitude, longitude);
          bounds.maxLatitude = Math.max(bounds.maxLatitude, latitude);
        }
      }
    }
  }

  if (!Number.isFinite(bounds.minLongitude) || !Number.isFinite(bounds.minLatitude)) {
    throw new Error("MeshCore region GeoJSON does not contain finite coordinates");
  }

  return [
    bounds.minLongitude,
    bounds.minLatitude,
    bounds.maxLongitude,
    bounds.maxLatitude,
  ];
}

function coerceFiniteNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  return null;
}
