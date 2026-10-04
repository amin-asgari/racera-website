CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  installation_id TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  device_model TEXT,
  device_name TEXT,
  platform_identifier TEXT,
  os_version TEXT NOT NULL,
  device_timezone TEXT NOT NULL,
  device_utc_offset_minutes INTEGER NOT NULL
    CHECK (device_utc_offset_minutes BETWEEN -840 AND 840),
  device_locale TEXT NOT NULL,
  device_region_code TEXT,
  edge_country_code TEXT,
  edge_region TEXT,
  edge_region_code TEXT,
  edge_timezone TEXT,
  choices_json TEXT NOT NULL CHECK (json_valid(choices_json)),
  client_submitted_at TEXT NOT NULL,
  submitted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS votes_submitted_at_idx
  ON votes (submitted_at DESC);

CREATE INDEX IF NOT EXISTS votes_edge_country_code_idx
  ON votes (edge_country_code);
