CREATE TABLE IF NOT EXISTS activities (
    id              SERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    current_ftp     INTEGER,
    training_load   REAL,
    kj              INTEGER,
    normalized_watts INTEGER,
    miles           REAL,
    duration        TEXT,
    hours           REAL,
    elevation       TEXT,
    mph             REAL,
    calories        INTEGER,
    temperature     TEXT,
    intensity_factor REAL,
    fatigue         REAL,
    fitness         REAL,
    zone            REAL,
    raw_json        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (date)
);

CREATE TABLE IF NOT EXISTS wellness (
    id              SERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    fitness         REAL,
    fatigue         REAL,
    fitness_load    REAL,
    fatigue_load    REAL,
    ramp_rate       REAL,
    raw_json        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (date)
);

CREATE TABLE IF NOT EXISTS schedules (
    id              SERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    offset_days     INTEGER,
    fitness         REAL,
    fatigue         REAL,
    form            REAL,
    training_load   REAL,
    needs_ride      BOOLEAN,
    zone            REAL,
    ride_options    JSONB,
    meta            JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (date)
);

CREATE INDEX IF NOT EXISTS idx_activities_date ON activities (date);
CREATE INDEX IF NOT EXISTS idx_wellness_date   ON wellness (date);
CREATE INDEX IF NOT EXISTS idx_schedules_date  ON schedules (date);
