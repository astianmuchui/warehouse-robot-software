package api

import (
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/astianmuchui/mobilerobot/internal/scylla"
)

// parseRangeTime accepts ISO8601 (e.g. "2026-05-21T08:00:00Z") or a date-only
// string ("2026-05-21"). Returns zero time when input is empty/invalid.
func parseRangeTime(s string, endOfDay bool) time.Time {
	if s == "" {
		return time.Time{}
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.UTC()
	}
	if t, err := time.Parse("2006-01-02T15:04", s); err == nil {
		return t.UTC()
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		if endOfDay {
			t = t.Add(24*time.Hour - time.Second)
		}
		return t.UTC()
	}
	return time.Time{}
}


func TelemetryLatestHandler(c *fiber.Ctx) error {
	deviceID := c.Query("device_id", "WRBT202642")

	if scylla.Session == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "ScyllaDB not connected",
		})
	}

	rec, err := scylla.GetLatestTelemetry(scylla.Session, deviceID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(rec)
}


func TelemetryHistoryHandler(c *fiber.Ctx) error {
	deviceID := c.Query("device_id", "WRBT202642")
	hours := c.QueryInt("hours", 24)
	startStr := c.Query("start", "")
	endStr := c.Query("end", "")

	if scylla.Session == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "ScyllaDB not connected",
		})
	}

	var (
		recs []scylla.TelemetryRecord
		err  error
	)

	start := parseRangeTime(startStr, false)
	end := parseRangeTime(endStr, true)

	switch {
	case !start.IsZero() && !end.IsZero():
		if end.Before(start) {
			start, end = end, start
		}
		recs, err = scylla.GetTelemetryRange(scylla.Session, deviceID, start, end)
	case !start.IsZero():
		recs, err = scylla.GetTelemetryRange(scylla.Session, deviceID, start, time.Now().UTC())
	case !end.IsZero():
		recs, err = scylla.GetTelemetryRange(scylla.Session, deviceID, time.Time{}, end)
	default:
		recs, err = scylla.GetTelemetryHistory(scylla.Session, deviceID, hours)
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	
	type point struct {
		T             string  `json:"t"`
		TempC         float64 `json:"temp_c"`
		HumidityPct   float64 `json:"humidity_pct"`
		AirQualityPPM float64 `json:"air_quality_ppm"`
		AccelX        float64 `json:"accel_x"`
		AccelY        float64 `json:"accel_y"`
		AccelZ        float64 `json:"accel_z"`
		GyroX         float64 `json:"gyro_x"`
		GyroY         float64 `json:"gyro_y"`
		GyroZ         float64 `json:"gyro_z"`
		DistanceCm    float64 `json:"distance_cm"`
	}

	points := make([]point, 0, len(recs))
	for _, r := range recs {
		points = append(points, point{
			T:             r.CreatedAt.Format("2006-01-02T15:04:05Z"),
			TempC:         r.TempC,
			HumidityPct:   r.HumidityPct,
			AirQualityPPM: r.AirQualityPPM,
			AccelX:        r.AccelX,
			AccelY:        r.AccelY,
			AccelZ:        r.AccelZ,
			GyroX:         r.GyroX,
			GyroY:         r.GyroY,
			GyroZ:         r.GyroZ,
			DistanceCm:    r.DistanceCm,
		})
	}

	return c.JSON(fiber.Map{
		"device_id": deviceID,
		"hours":     hours,
		"start":     startStr,
		"end":       endStr,
		"count":     len(points),
		"data":      points,
	})
}



func TelemetryIMUHandler(c *fiber.Ctx) error {
	deviceID := c.Query("device_id", "WRBT202642")

	if scylla.Session == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "ScyllaDB not connected"})
	}

	rec, err := scylla.GetLatestTelemetry(scylla.Session, deviceID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"device_id":   deviceID,
		"accel_x":     rec.AccelX,
		"accel_y":     rec.AccelY,
		"accel_z":     rec.AccelZ,
		"gyro_x":      rec.GyroX,
		"gyro_y":      rec.GyroY,
		"gyro_z":      rec.GyroZ,
		"imu_temp_c":  rec.IMUTempC,
		"recorded_at": rec.CreatedAt,
	})
}


func EventsAPIHandler(c *fiber.Ctx) error {
	deviceID := c.Query("device_id", "")
	page := c.QueryInt("page", 1)
	if page < 1 {
		page = 1
	}

	if scylla.Session == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "ScyllaDB not connected"})
	}

	events, err := scylla.GetRecentEvents(scylla.Session, deviceID, 50)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"page":   page,
		"count":  len(events),
		"events": events,
	})
}



func TelemetryIMUReplayHandler(c *fiber.Ctx) error {
	deviceID := c.Query("device_id", "WRBT202642")
	limit := c.QueryInt("limit", 50)
	if limit < 1 {
		limit = 1
	}
	if limit > 5000 {
		limit = 5000
	}
	startStr := c.Query("start", "")
	endStr := c.Query("end", "")

	if scylla.Session == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "ScyllaDB not connected"})
	}

	var (
		recs []scylla.TelemetryRecord
		err  error
	)

	start := parseRangeTime(startStr, false)
	end := parseRangeTime(endStr, true)

	if !start.IsZero() || !end.IsZero() {
		if start.IsZero() {
			start = time.Time{}
		}
		if end.IsZero() {
			end = time.Now().UTC()
		}
		if !start.IsZero() && !end.IsZero() && end.Before(start) {
			start, end = end, start
		}
		recs, err = scylla.GetTelemetryRange(scylla.Session, deviceID, start, end)
		if err == nil && len(recs) > limit {
			step := float64(len(recs)) / float64(limit)
			thinned := make([]scylla.TelemetryRecord, 0, limit)
			for i := 0; i < limit; i++ {
				thinned = append(thinned, recs[int(float64(i)*step)])
			}
			recs = thinned
		}
	} else {
		recs, err = scylla.GetLatestTelemetryN(scylla.Session, deviceID, limit)
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	type frame struct {
		T      string  `json:"t"`
		AccelX float64 `json:"accel_x"`
		AccelY float64 `json:"accel_y"`
		AccelZ float64 `json:"accel_z"`
		GyroX  float64 `json:"gyro_x"`
		GyroY  float64 `json:"gyro_y"`
		GyroZ  float64 `json:"gyro_z"`
	}

	frames := make([]frame, 0, len(recs))
	for _, r := range recs {
		frames = append(frames, frame{
			T:      r.CreatedAt.Format("2006-01-02T15:04:05Z"),
			AccelX: r.AccelX,
			AccelY: r.AccelY,
			AccelZ: r.AccelZ,
			GyroX:  r.GyroX,
			GyroY:  r.GyroY,
			GyroZ:  r.GyroZ,
		})
	}

	return c.JSON(fiber.Map{
		"device_id": deviceID,
		"count":     len(frames),
		"frames":    frames,
	})
}


func TelemetryCountHandler(c *fiber.Ctx) error {
	deviceID := c.Query("device_id", "")

	if scylla.Session == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "ScyllaDB not connected"})
	}

	count, err := scylla.GetTelemetryCount(scylla.Session, deviceID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"device_id": deviceID, "count": count})
}

func TelemetryIngestHandler(c *fiber.Ctx) error {
	if scylla.Session == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "ScyllaDB not connected"})
	}

	var rec scylla.TelemetryRecord
	if err := json.Unmarshal(c.Body(), &rec); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if err := scylla.LogTelemetry(scylla.Session, rec); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"ok": true})
}
