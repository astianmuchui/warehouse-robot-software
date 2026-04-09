package scylla

import (
	"fmt"
	"time"

	"github.com/gocql/gocql"
	"github.com/google/uuid"
)



func newestTelemetryID(session *gocql.Session) (int, error) {
	var id int
	err := session.Query(
		`SELECT id FROM robot_telemetry WHERE partition_key = 0 ORDER BY created_at DESC LIMIT 1`,
	).Scan(&id)
	if err == gocql.ErrNotFound {
		return 0, nil
	}
	return id, err
}

func newestEventID(session *gocql.Session) (int, error) {
	var id int
	err := session.Query(
		`SELECT id FROM robot_events WHERE partition_key = 0 ORDER BY created_at DESC LIMIT 1`,
	).Scan(&id)
	if err == gocql.ErrNotFound {
		return 0, nil
	}
	return id, err
}



func LogTelemetry(session *gocql.Session, r TelemetryRecord) error {
	id, err := newestTelemetryID(session)
	if err != nil {
		return fmt.Errorf("LogTelemetry id: %w", err)
	}

	return session.Query(`
		INSERT INTO robot_telemetry (
			partition_key, id, uuid, device_id,
			temp_c, humidity_pct, air_quality_ppm, air_quality_v,
			accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, imu_temp_c,
			distance_cm, lat, lon, alt_m, speed_kmph, satellites,
			rssi, uptime_s, raw_json, created_at
		) VALUES (?,?,?,?, ?,?,?,?, ?,?,?,?,?,?,?, ?,?,?,?,?,?, ?,?,?,?)`,
		0, id+1, uuid.New().String(), r.DeviceID,
		r.TempC, r.HumidityPct, r.AirQualityPPM, r.AirQualityV,
		r.AccelX, r.AccelY, r.AccelZ, r.GyroX, r.GyroY, r.GyroZ, r.IMUTempC,
		r.DistanceCm, r.Lat, r.Lon, r.AltM, r.SpeedKmph, r.Satellites,
		r.RSSI, r.UptimeS, r.RawJSON, time.Now().UTC(),
	).Exec()
}

func LogEvent(session *gocql.Session, e EventRecord) error {
	id, err := newestEventID(session)
	if err != nil {
		return fmt.Errorf("LogEvent id: %w", err)
	}

	return session.Query(`
		INSERT INTO robot_events (
			partition_key, id, uuid, event_type,
			message, severity, device_id, raw_json, time_logged, created_at
		) VALUES (?,?,?,?, ?,?,?,?,?,?)`,
		0, id+1, uuid.New().String(), e.EventType,
		e.Message, e.Severity, e.DeviceID, e.RawJSON, e.TimeLogged, time.Now().UTC(),
	).Exec()
}



func GetLatestTelemetry(session *gocql.Session, deviceID string) (TelemetryRecord, error) {
	var r TelemetryRecord
	err := session.Query(`
		SELECT id, uuid, device_id,
		       temp_c, humidity_pct, air_quality_ppm, air_quality_v,
		       accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, imu_temp_c,
		       distance_cm, lat, lon, alt_m, speed_kmph, satellites,
		       rssi, uptime_s, raw_json, created_at
		FROM robot_telemetry
		WHERE partition_key = 0 AND device_id = ?
		ORDER BY created_at DESC
		LIMIT 1
		ALLOW FILTERING`,
		deviceID,
	).Scan(
		&r.ID, &r.UUID, &r.DeviceID,
		&r.TempC, &r.HumidityPct, &r.AirQualityPPM, &r.AirQualityV,
		&r.AccelX, &r.AccelY, &r.AccelZ, &r.GyroX, &r.GyroY, &r.GyroZ, &r.IMUTempC,
		&r.DistanceCm, &r.Lat, &r.Lon, &r.AltM, &r.SpeedKmph, &r.Satellites,
		&r.RSSI, &r.UptimeS, &r.RawJSON, &r.CreatedAt,
	)
	if err != nil {
		return r, fmt.Errorf("GetLatestTelemetry: %w", err)
	}
	return r, nil
}

func GetTelemetryHistory(session *gocql.Session, deviceID string, hours int) ([]TelemetryRecord, error) {
	if hours <= 0 {
		hours = 24
	}
	cutoff := time.Now().UTC().Add(-time.Duration(hours) * time.Hour)

	iter := session.Query(`
		SELECT id, uuid, device_id,
		       temp_c, humidity_pct, air_quality_ppm, air_quality_v,
		       accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, imu_temp_c,
		       distance_cm, lat, lon, alt_m, speed_kmph, satellites,
		       rssi, uptime_s, raw_json, created_at
		FROM robot_telemetry
		WHERE partition_key = 0 AND device_id = ? AND created_at >= ?
		ORDER BY created_at ASC
		ALLOW FILTERING`,
		deviceID, cutoff,
	).Iter()

	var results []TelemetryRecord
	var r TelemetryRecord
	for iter.Scan(
		&r.ID, &r.UUID, &r.DeviceID,
		&r.TempC, &r.HumidityPct, &r.AirQualityPPM, &r.AirQualityV,
		&r.AccelX, &r.AccelY, &r.AccelZ, &r.GyroX, &r.GyroY, &r.GyroZ, &r.IMUTempC,
		&r.DistanceCm, &r.Lat, &r.Lon, &r.AltM, &r.SpeedKmph, &r.Satellites,
		&r.RSSI, &r.UptimeS, &r.RawJSON, &r.CreatedAt,
	) {
		results = append(results, r)
		r = TelemetryRecord{}
	}
	if err := iter.Close(); err != nil {
		return nil, fmt.Errorf("GetTelemetryHistory: %w", err)
	}
	return results, nil
}

func GetLatestTelemetryN(session *gocql.Session, deviceID string, limit int) ([]TelemetryRecord, error) {
	if limit <= 0 {
		limit = 50
	}
	iter := session.Query(`
		SELECT id, uuid, device_id,
		       temp_c, humidity_pct, air_quality_ppm, air_quality_v,
		       accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, imu_temp_c,
		       distance_cm, lat, lon, alt_m, speed_kmph, satellites,
		       rssi, uptime_s, raw_json, created_at
		FROM robot_telemetry
		WHERE partition_key = 0 AND device_id = ?
		ORDER BY created_at DESC
		LIMIT ?
		ALLOW FILTERING`,
		deviceID, limit,
	).Iter()

	var results []TelemetryRecord
	var r TelemetryRecord
	for iter.Scan(
		&r.ID, &r.UUID, &r.DeviceID,
		&r.TempC, &r.HumidityPct, &r.AirQualityPPM, &r.AirQualityV,
		&r.AccelX, &r.AccelY, &r.AccelZ, &r.GyroX, &r.GyroY, &r.GyroZ, &r.IMUTempC,
		&r.DistanceCm, &r.Lat, &r.Lon, &r.AltM, &r.SpeedKmph, &r.Satellites,
		&r.RSSI, &r.UptimeS, &r.RawJSON, &r.CreatedAt,
	) {
		results = append(results, r)
		r = TelemetryRecord{}
	}
	if err := iter.Close(); err != nil {
		return nil, fmt.Errorf("GetLatestTelemetryN: %w", err)
	}
	
	for i, j := 0, len(results)-1; i < j; i, j = i+1, j-1 {
		results[i], results[j] = results[j], results[i]
	}
	return results, nil
}

func GetRecentEvents(session *gocql.Session, deviceID string, limit int) ([]EventRecord, error) {
	var query string
	var args []interface{}

	if deviceID != "" {
		query = `
			SELECT id, uuid, event_type, message, severity, device_id, raw_json, time_logged, created_at
			FROM robot_events
			WHERE partition_key = 0 AND device_id = ?
			LIMIT ?
			ALLOW FILTERING`
		args = []interface{}{deviceID, limit}
	} else {
		query = `
			SELECT id, uuid, event_type, message, severity, device_id, raw_json, time_logged, created_at
			FROM robot_events
			WHERE partition_key = 0
			LIMIT ?`
		args = []interface{}{limit}
	}

	iter := session.Query(query, args...).Iter()
	var results []EventRecord
	var e EventRecord
	for iter.Scan(&e.ID, &e.UUID, &e.EventType, &e.Message, &e.Severity, &e.DeviceID, &e.RawJSON, &e.TimeLogged, &e.CreatedAt) {
		results = append(results, e)
		e = EventRecord{}
	}
	if err := iter.Close(); err != nil {
		return nil, fmt.Errorf("GetRecentEvents: %w", err)
	}
	
	for i, j := 0, len(results)-1; i < j; i, j = i+1, j-1 {
		results[i], results[j] = results[j], results[i]
	}
	return results, nil
}

func GetEventsPaginated(session *gocql.Session, limit, page int) ([]EventRecord, error) {
	fetchLimit := limit * page
	iter := session.Query(`
		SELECT id, uuid, event_type, message, severity, device_id, raw_json, time_logged, created_at
		FROM robot_events
		WHERE partition_key = 0
		LIMIT ?`, fetchLimit,
	).Iter()

	var all []EventRecord
	var e EventRecord
	for iter.Scan(&e.ID, &e.UUID, &e.EventType, &e.Message, &e.Severity, &e.DeviceID, &e.RawJSON, &e.TimeLogged, &e.CreatedAt) {
		all = append(all, e)
		e = EventRecord{}
	}
	if err := iter.Close(); err != nil {
		return nil, fmt.Errorf("GetEventsPaginated: %w", err)
	}

	start := (page - 1) * limit
	if start >= len(all) {
		return []EventRecord{}, nil
	}
	end := start + limit
	if end > len(all) {
		end = len(all)
	}
	return all[start:end], nil
}

func GetEventsCount(session *gocql.Session) (int, error) {
	var count int
	err := session.Query(`SELECT COUNT(*) FROM robot_events WHERE partition_key = 0`).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("GetEventsCount: %w", err)
	}
	return count, nil
}

func GetTelemetryCount(session *gocql.Session, deviceID string) (int, error) {
	var count int
	var err error
	if deviceID != "" {
		err = session.Query(
			`SELECT COUNT(*) FROM robot_telemetry WHERE partition_key = 0 AND device_id = ? ALLOW FILTERING`,
			deviceID,
		).Scan(&count)
	} else {
		err = session.Query(
			`SELECT COUNT(*) FROM robot_telemetry WHERE partition_key = 0`,
		).Scan(&count)
	}
	if err != nil {
		return 0, fmt.Errorf("GetTelemetryCount: %w", err)
	}
	return count, nil
}
