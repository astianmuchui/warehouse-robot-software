package mqtt

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/astianmuchui/mobilerobot/internal/db"
	"github.com/astianmuchui/mobilerobot/internal/models"
	"github.com/astianmuchui/mobilerobot/internal/scylla"
)



type bootPayload struct {
	DeviceID  string `json:"device_id"`
	Event     string `json:"event"`
	Timestamp uint32 `json:"timestamp"`
	Firmware  string `json:"firmware"`
	Transport string `json:"transport"`
	IP        string `json:"ip"`
	RSSI      int    `json:"rssi"`
	UptimeMS  uint32 `json:"uptime_ms"`
}

type heartbeatPayload struct {
	DeviceID  string `json:"device_id"`
	Timestamp uint32 `json:"timestamp"`
	UptimeS   uint32 `json:"uptime_s"`
	RSSI      int    `json:"rssi"`
}

type readingsPayload struct {
	DeviceID  string `json:"device_id"`
	Timestamp uint32 `json:"timestamp"`
	UptimeS   uint32 `json:"uptime_s"`
	Environment struct {
		TempC        float64 `json:"temperature_c"`
		HumidityPct  float64 `json:"humidity_pct"`
		AirQualityPPM float64 `json:"air_quality_ppm"`
		AirQualityV  float64 `json:"air_quality_v"`
	} `json:"environment"`
	IMU struct {
		AccelX   float64 `json:"accel_x"`
		AccelY   float64 `json:"accel_y"`
		AccelZ   float64 `json:"accel_z"`
		GyroX    float64 `json:"gyro_x"`
		GyroY    float64 `json:"gyro_y"`
		GyroZ    float64 `json:"gyro_z"`
		TempC    float64 `json:"temperature_c"`
	} `json:"imu"`
	Proximity struct {
		DistanceCm float64 `json:"distance_cm"`
		Valid      bool    `json:"valid"`
	} `json:"proximity"`
	Location struct {
		Lat        float64 `json:"lat"`
		Lon        float64 `json:"lon"`
		AltitudeM  float64 `json:"altitude_m"`
		SpeedKmph  float64 `json:"speed_kmph"`
		Satellites uint32  `json:"satellites"`
		Valid       bool   `json:"valid"`
	} `json:"location"`
	System struct {
		RSSI      int    `json:"rssi"`
		Transport string `json:"transport"`
	} `json:"system"`
}

type imuEventPayload struct {
	DeviceID  string  `json:"device_id"`
	Event     string  `json:"event"`
	Timestamp uint32  `json:"timestamp"`
	UptimeS   uint32  `json:"uptime_s"`
	AccelX    float64 `json:"accel_x"`
	AccelY    float64 `json:"accel_y"`
	AccelZ    float64 `json:"accel_z"`
}



func handleBoot(raw string) error {
	var p bootPayload
	if err := json.Unmarshal([]byte(raw), &p); err != nil {
		return fmt.Errorf("handleBoot: %w", err)
	}

	
	if db.DB != nil {
		var device models.Device
		result := db.DB.Where("device_id = ?", p.DeviceID).First(&device)
		if result.Error != nil {
			device = models.Device{
				DeviceID: p.DeviceID,
				Firmware: p.Firmware,
				IP:       p.IP,
			}
			db.DB.Create(&device)
		} else {
			device.Firmware = p.Firmware
			device.IP = p.IP
			db.DB.Save(&device)
		}
	}

	
	if scylla.Session != nil {
		return scylla.LogEvent(scylla.Session, scylla.EventRecord{
			EventType:  "boot",
			Message:    fmt.Sprintf("Device %s booted (firmware %s, IP %s)", p.DeviceID, p.Firmware, p.IP),
			Severity:   "info",
			DeviceID:   p.DeviceID,
			RawJSON:    raw,
			TimeLogged: strconv.FormatInt(time.Now().Unix(), 10),
		})
	}
	return nil
}

func handleHeartbeat(raw string) error {
	var p heartbeatPayload
	if err := json.Unmarshal([]byte(raw), &p); err != nil {
		return fmt.Errorf("handleHeartbeat: %w", err)
	}

	if scylla.Session != nil {
		return scylla.LogEvent(scylla.Session, scylla.EventRecord{
			EventType:  "heartbeat",
			Message:    fmt.Sprintf("Heartbeat from %s (uptime %ds, RSSI %d)", p.DeviceID, p.UptimeS, p.RSSI),
			Severity:   "info",
			DeviceID:   p.DeviceID,
			RawJSON:    raw,
			TimeLogged: strconv.FormatUint(uint64(p.Timestamp), 10),
		})
	}
	return nil
}

func handleReadings(raw string) error {
	var p readingsPayload
	if err := json.Unmarshal([]byte(raw), &p); err != nil {
		return fmt.Errorf("handleReadings: %w", err)
	}

	rec := scylla.TelemetryRecord{
		DeviceID:      p.DeviceID,
		TempC:         p.Environment.TempC,
		HumidityPct:   p.Environment.HumidityPct,
		AirQualityPPM: p.Environment.AirQualityPPM,
		AirQualityV:   p.Environment.AirQualityV,
		AccelX:        p.IMU.AccelX,
		AccelY:        p.IMU.AccelY,
		AccelZ:        p.IMU.AccelZ,
		GyroX:         p.IMU.GyroX,
		GyroY:         p.IMU.GyroY,
		GyroZ:         p.IMU.GyroZ,
		IMUTempC:      p.IMU.TempC,
		DistanceCm:    p.Proximity.DistanceCm,
		Lat:           p.Location.Lat,
		Lon:           p.Location.Lon,
		AltM:          p.Location.AltitudeM,
		SpeedKmph:     p.Location.SpeedKmph,
		Satellites:    int(p.Location.Satellites),
		RSSI:          p.System.RSSI,
		UptimeS:       int64(p.UptimeS),
		RawJSON:       raw,
	}

	if scylla.Session != nil {
		if err := scylla.LogTelemetry(scylla.Session, rec); err != nil {
			return fmt.Errorf("handleReadings log: %w", err)
		}
	}

	
	if db.DB != nil {
		go checkThresholds(p.DeviceID, rec)
	}

	return nil
}

func handleIMUEvent(eventType, raw string) error {
	var p imuEventPayload
	if err := json.Unmarshal([]byte(raw), &p); err != nil {
		return fmt.Errorf("handleIMUEvent: %w", err)
	}

	severity := "info"
	if eventType == "freefall" {
		severity = "warning"
	}

	if scylla.Session != nil {
		return scylla.LogEvent(scylla.Session, scylla.EventRecord{
			EventType:  eventType,
			Message:    fmt.Sprintf("IMU event [%s] on device %s (a=%.2f,%.2f,%.2f)", eventType, p.DeviceID, p.AccelX, p.AccelY, p.AccelZ),
			Severity:   severity,
			DeviceID:   p.DeviceID,
			RawJSON:    raw,
			TimeLogged: strconv.FormatUint(uint64(p.Timestamp), 10),
		})
	}
	return nil
}



func checkThresholds(deviceID string, rec scylla.TelemetryRecord) {
	var thresholds []models.Threshold
	db.DB.Where("device_id = ? AND enabled = ?", deviceID, true).Find(&thresholds)

	metricValue := map[string]float64{
		"temperature":    rec.TempC,
		"humidity":       rec.HumidityPct,
		"air_quality":    rec.AirQualityPPM,
		"distance":       rec.DistanceCm,
		"accel_x":        rec.AccelX,
		"accel_y":        rec.AccelY,
		"accel_z":        rec.AccelZ,
	}

	for _, t := range thresholds {
		val, ok := metricValue[t.Metric]
		if !ok {
			continue
		}

		violated := false
		msg := ""

		if t.MaxValue != nil && val > *t.MaxValue {
			violated = true
			msg = fmt.Sprintf("ALERT: %s on %s exceeded max (%.2f > %.2f)", t.Metric, deviceID, val, *t.MaxValue)
		} else if t.MinValue != nil && val < *t.MinValue {
			violated = true
			msg = fmt.Sprintf("ALERT: %s on %s below min (%.2f < %.2f)", t.Metric, deviceID, val, *t.MinValue)
		}

		if violated && scylla.Session != nil {
			_ = scylla.LogEvent(scylla.Session, scylla.EventRecord{
				EventType:  "alert",
				Message:    msg,
				Severity:   "warning",
				DeviceID:   deviceID,
				RawJSON:    fmt.Sprintf(`{"metric":"%s","value":%.4f}`, t.Metric, val),
				TimeLogged: strconv.FormatInt(time.Now().Unix(), 10),
			})
		}
	}
}
