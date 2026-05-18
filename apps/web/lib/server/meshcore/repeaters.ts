import type { D1Database } from "@cloudflare/workers-types";
import type { Insertable, Kysely, Selectable } from "kysely";
import { z } from "zod";

import {
  getMeshcoreRepeatersUrl,
  MESHCORE_IATA_REGIONS,
  type MeshcoreIataRegion,
} from "../../meshcore/regions";
import { createDatabase, type Database, type MeshcoreRepeaterTable } from "../db";

const MESHCORE_FETCH_TIMEOUT_MS = 10_000;

const meshMapperRepeaterListSchema = z.array(z.unknown());

const requiredStringSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1));

const optionalStringSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return String(value);
}, z.string().nullable());

const nullableNumberSchema = z.preprocess(
  (value) => coerceFiniteNumber(value),
  z.number().nullable(),
);

const nullableIntegerSchema = nullableNumberSchema.transform((value) =>
  value === null ? null : Math.trunc(value),
);

const requiredIntegerSchema = z.preprocess((value) => {
  const number = coerceFiniteNumber(value);
  return number === null ? undefined : Math.trunc(number);
}, z.number().int());

const meshMapperRepeaterSchema = z.object({
  id: requiredStringSchema,
  hex_id: requiredStringSchema,
  name: requiredStringSchema,
  lat: nullableNumberSchema,
  lon: nullableNumberSchema,
  last_heard: nullableIntegerSchema,
  created_at: nullableIntegerSchema,
  enabled: requiredIntegerSchema,
  power: optionalStringSchema,
  iata: optionalStringSchema,
  hop_bytes: nullableIntegerSchema,
});

export type MeshcoreRepeater = Selectable<MeshcoreRepeaterTable>;

export interface ListMeshcoreRepeatersOptions {
  iata?: MeshcoreIataRegion;
}

export interface ListMeshcoreRepeatersResult {
  repeaters: MeshcoreRepeater[];
  recordedAtMax: number | null;
}

export interface SyncMeshcoreRegionResult {
  iata: MeshcoreIataRegion;
  fetched: number;
  upserted: number;
  skipped: number;
  error?: string;
}

export interface SyncMeshcoreRepeatersResult {
  recordedAt: number;
  regions: SyncMeshcoreRegionResult[];
  fetched: number;
  upserted: number;
  skipped: number;
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

export async function syncMeshcoreRepeaters(
  database: D1Database,
  options: {
    now?: Date;
    regions?: readonly MeshcoreIataRegion[];
  } = {},
): Promise<SyncMeshcoreRepeatersResult> {
  const db = createDatabase(database);
  const recordedAt = toUnixSeconds(options.now ?? new Date());
  const regions = options.regions ?? MESHCORE_IATA_REGIONS;
  const results: SyncMeshcoreRegionResult[] = [];

  for (const iata of regions) {
    results.push(await syncMeshcoreRegion(db, iata, recordedAt));
  }

  return {
    recordedAt,
    regions: results,
    fetched: sum(results, "fetched"),
    upserted: sum(results, "upserted"),
    skipped: sum(results, "skipped"),
  };
}

async function syncMeshcoreRegion(
  db: Kysely<Database>,
  iata: MeshcoreIataRegion,
  recordedAt: number,
): Promise<SyncMeshcoreRegionResult> {
  try {
    const rawRepeaters = await fetchMeshcoreRegion(iata);
    const rows = rawRepeaters
      .map((rawRepeater) => normalizeMeshcoreRepeater(rawRepeater, iata, recordedAt))
      .filter((row): row is Insertable<MeshcoreRepeaterTable> => row !== null);

    for (const row of rows) {
      await upsertMeshcoreRepeater(db, row);
    }

    return {
      iata,
      fetched: rawRepeaters.length,
      upserted: rows.length,
      skipped: rawRepeaters.length - rows.length,
    };
  } catch (error) {
    return {
      iata,
      fetched: 0,
      upserted: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : "Unknown MeshMapper sync error",
    };
  }
}

async function fetchMeshcoreRegion(iata: MeshcoreIataRegion): Promise<unknown[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MESHCORE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(getMeshcoreRepeatersUrl(iata), {
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`MeshMapper ${iata} returned ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const result = meshMapperRepeaterListSchema.safeParse(payload);

    if (!result.success) {
      throw new Error(`MeshMapper ${iata} response was not an array`);
    }

    return result.data;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeMeshcoreRepeater(
  value: unknown,
  fallbackIata: MeshcoreIataRegion,
  recordedAt: number,
): Insertable<MeshcoreRepeaterTable> | null {
  const result = meshMapperRepeaterSchema.safeParse(value);

  if (!result.success) {
    return null;
  }

  const repeater = result.data;

  return {
    iata: repeater.iata ?? fallbackIata,
    id: repeater.id,
    hex_id: repeater.hex_id,
    name: repeater.name,
    lat: repeater.lat,
    lon: repeater.lon,
    last_heard: repeater.last_heard,
    created_at: repeater.created_at,
    enabled: repeater.enabled,
    power: repeater.power,
    hop_bytes: repeater.hop_bytes,
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

function toUnixSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

function sum(results: SyncMeshcoreRegionResult[], key: "fetched" | "upserted" | "skipped") {
  return results.reduce((total, result) => total + result[key], 0);
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
