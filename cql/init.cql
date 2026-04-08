


CREATE KEYSPACE IF NOT EXISTS sgg_warehouse
  WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'}
  AND DURABLE_WRITES = true;

USE sgg_warehouse;


CREATE TABLE IF NOT EXISTS robot_telemetry (
    partition_key   INT,
    id              INT,
    uuid            TEXT,
    device_id       TEXT,


    temp_c          DOUBLE,
    humidity_pct    DOUBLE,
    air_quality_ppm DOUBLE,
    air_quality_v   DOUBLE,


    accel_x         DOUBLE,
    accel_y         DOUBLE,
    accel_z         DOUBLE,
    gyro_x          DOUBLE,
    gyro_y          DOUBLE,
    gyro_z          DOUBLE,
    imu_temp_c      DOUBLE,


    distance_cm     DOUBLE,


    lat             DOUBLE,
    lon             DOUBLE,
    alt_m           DOUBLE,
    speed_kmph      DOUBLE,
    satellites      INT,


    rssi            INT,
    uptime_s        BIGINT,
    raw_json        TEXT,

    created_at      TIMESTAMP,

    PRIMARY KEY (partition_key, created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id ASC);


CREATE TABLE IF NOT EXISTS robot_events (
    partition_key INT,
    id            INT,
    uuid          TEXT,
    event_type    TEXT,
    message       TEXT,
    severity      TEXT,
    device_id     TEXT,
    raw_json      TEXT,
    time_logged   TEXT,
    created_at    TIMESTAMP,

    PRIMARY KEY (partition_key, created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id ASC);

DESCRIBE KEYSPACES;
