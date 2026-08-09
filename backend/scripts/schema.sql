-- Hush database schema (PostgreSQL / Neon free tier)

CREATE TABLE IF NOT EXISTS sensor_locations (
    location_id         text PRIMARY KEY,
    sensor_name          text,
    sensor_description   text,
    location_type        text,
    status                text,
    latitude              numeric NOT NULL,
    longitude             numeric NOT NULL,
    direction_1_label    text,
    direction_2_label    text,
    installation_date    date,
    note                  text
);

CREATE TABLE IF NOT EXISTS pedestrian_minute_count (
    location_id           text NOT NULL,
    sensing_datetime      timestamptz NOT NULL,
    direction_1_count     integer,
    direction_2_count     integer,
    total_of_direction    integer GENERATED ALWAYS AS (
                               COALESCE(direction_1_count, 0) + COALESCE(direction_2_count, 0)
                           ) STORED,
    PRIMARY KEY (location_id, sensing_datetime)
);
-- Deliberately no FK to sensor_locations: the 15-minute sync job must never
-- fail its whole batch because the live feed mentions a sensor ID we
-- haven't (re)seeded yet.

CREATE INDEX IF NOT EXISTS idx_minute_count_datetime ON pedestrian_minute_count (sensing_datetime);
