import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

export type RepeaterTable = {
  location_iata: string;
  hex_id: string;
  network_id: string;
  name: string | null;
  lat: number;
  lon: number;
  last_heard: string | null;
  created_at: string | null;
  modified_at: string;
};

export type RepeaterNeighborTable = {
  source_hex_id: string;
  neighbor_hex_id: string;
  first_observed_at: string;
  last_observed_at: string;
};

export type Database = {
  repeater_neighbors: RepeaterNeighborTable;
  repeaters: RepeaterTable;
};

export function createDatabase(database: D1Database): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database }),
  });
}
