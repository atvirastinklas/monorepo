import type { D1Database } from "@cloudflare/workers-types";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

export interface MeshcoreRepeaterTable {
  iata: string;
  id: string;
  hex_id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  last_heard: number | null;
  created_at: number | null;
  enabled: number;
  power: string | null;
  hop_bytes: number | null;
  recorded_at: number;
  updated_at: number;
}

export interface Database {
  meshcore_repeaters: MeshcoreRepeaterTable;
}

export function createDatabase(database: D1Database) {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database }),
  });
}
