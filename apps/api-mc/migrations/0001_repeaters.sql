CREATE TABLE IF NOT EXISTS repeaters (
  location_iata TEXT NOT NULL,
  hex_id TEXT NOT NULL PRIMARY KEY,
  network_id TEXT NOT NULL,
  name TEXT,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  last_heard TEXT,
  created_at TEXT,
  modified_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_repeaters_location_iata ON repeaters (location_iata);
CREATE INDEX IF NOT EXISTS idx_repeaters_modified_at ON repeaters (modified_at);

CREATE TABLE IF NOT EXISTS repeater_neighbors (
  source_hex_id TEXT NOT NULL,
  neighbor_hex_id TEXT NOT NULL,
  first_observed_at TEXT NOT NULL,
  last_observed_at TEXT NOT NULL,
  PRIMARY KEY (source_hex_id, neighbor_hex_id)
);

CREATE INDEX IF NOT EXISTS idx_repeater_neighbors_source ON repeater_neighbors (source_hex_id);
