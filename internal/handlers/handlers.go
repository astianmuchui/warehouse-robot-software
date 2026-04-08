package handlers

import (
	"github.com/gofiber/fiber/v2"

	"github.com/astianmuchui/mobilerobot/internal/db"
	"github.com/astianmuchui/mobilerobot/internal/models"
	"github.com/astianmuchui/mobilerobot/internal/scylla"
)

const defaultDeviceID = "WRBT202642"

func HomeHandler(c *fiber.Ctx) error {
	return c.Render("index", fiber.Map{
		"Title": "SGG Warehouse Robot",
	})
}

func ReplayHandler(c *fiber.Ctx) error {
	deviceID := c.Query("device_id", defaultDeviceID)
	return c.Render("replay", fiber.Map{
		"Title":    "Gyro Replay",
		"DeviceID": deviceID,
	})
}

func DashboardHandler(c *fiber.Ctx) error {
	deviceID := c.Query("device_id", defaultDeviceID)

	var latestTelemetry *scylla.TelemetryRecord
	if scylla.Session != nil {
		rec, err := scylla.GetLatestTelemetry(scylla.Session, deviceID)
		if err == nil {
			latestTelemetry = &rec
		}
	}

	recentEvents := []scylla.EventRecord{}
	if scylla.Session != nil {
		evts, _ := scylla.GetRecentEvents(scylla.Session, deviceID, 10)
		if evts != nil {
			recentEvents = evts
		}
	}

	return c.Render("dashboard", fiber.Map{
		"Title":           "Dashboard",
		"DeviceID":        deviceID,
		"LatestTelemetry": latestTelemetry,
		"RecentEvents":    recentEvents,
	})
}

func AnalysisHandler(c *fiber.Ctx) error {
	deviceID := c.Query("device_id", defaultDeviceID)
	return c.Render("analysis", fiber.Map{
		"Title":    "Analysis",
		"DeviceID": deviceID,
	})
}

func EventsHandler(c *fiber.Ctx) error {
	deviceID := c.Query("device_id", "")
	page := c.QueryInt("page", 1)
	if page < 1 {
		page = 1
	}

	var events []scylla.EventRecord
	total := 0

	if scylla.Session != nil {
		evts, _ := scylla.GetEventsPaginated(scylla.Session, 25, page)
		if evts != nil {
			events = evts
		}
		total, _ = scylla.GetEventsCount(scylla.Session)
	}

	totalPages := total / 25
	if total%25 != 0 {
		totalPages++
	}

	pages := make([]int, totalPages)
	for i := range pages {
		pages[i] = i + 1
	}

	return c.Render("events", fiber.Map{
		"Title":       "Events",
		"DeviceID":    deviceID,
		"Events":      events,
		"Page":        page,
		"TotalPages":  totalPages,
		"Pages":       pages,
		"Total":       total,
	})
}

func ThresholdsHandler(c *fiber.Ctx) error {
	deviceID := c.Query("device_id", defaultDeviceID)

	var thresholds []models.Threshold
	if db.DB != nil {
		db.DB.Where("device_id = ?", deviceID).Find(&thresholds)
	}

	return c.Render("thresholds", fiber.Map{
		"Title":      "Thresholds",
		"DeviceID":   deviceID,
		"Thresholds": thresholds,
	})
}
