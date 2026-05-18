CREATE TABLE IF NOT EXISTS meshcore_repeaters (
  iata TEXT NOT NULL,
  id TEXT NOT NULL,
  hex_id TEXT NOT NULL,
  name TEXT NOT NULL,
  lat REAL,
  lon REAL,
  last_heard INTEGER,
  created_at INTEGER,
  enabled INTEGER NOT NULL,
  power TEXT,
  hop_bytes INTEGER,
  recorded_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (iata, hex_id)
);

CREATE INDEX IF NOT EXISTS idx_meshcore_repeaters_iata
  ON meshcore_repeaters (iata);

CREATE INDEX IF NOT EXISTS idx_meshcore_repeaters_name
  ON meshcore_repeaters (name);

CREATE INDEX IF NOT EXISTS idx_meshcore_repeaters_last_heard
  ON meshcore_repeaters (last_heard);

CREATE INDEX IF NOT EXISTS idx_meshcore_repeaters_recorded_at
  ON meshcore_repeaters (recorded_at);
