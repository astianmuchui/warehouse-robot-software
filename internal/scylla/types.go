package scylla

import "time"

type TelemetryRecord struct {
	ID       int
	UUID     string
	DeviceID string

	TempC         float64
	HumidityPct   float64
	AirQualityPPM float64
	AirQualityV   float64

	AccelX   float64
	AccelY   float64
	AccelZ   float64
	GyroX    float64
	GyroY    float64
	GyroZ    float64
	IMUTempC float64

	DistanceCm float64

	Lat        float64
	Lon        float64
	AltM       float64
	SpeedKmph  float64
	Satellites int

	RSSI      int
	UptimeS   int64
	RawJSON   string
	CreatedAt time.Time
}

type EventRecord struct {
	ID         int
	UUID       string
	EventType  string
	Message    string
	Severity   string
	DeviceID   string
	RawJSON    string
	TimeLogged string
	CreatedAt  time.Time
}
