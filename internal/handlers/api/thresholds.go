package api

import (
	"github.com/gofiber/fiber/v2"

	"github.com/astianmuchui/mobilerobot/internal/db"
	"github.com/astianmuchui/mobilerobot/internal/models"
)

type thresholdRequest struct {
	DeviceID string   `json:"device_id"`
	Metric   string   `json:"metric"`
	Label    string   `json:"label"`
	MinValue *float64 `json:"min_value"`
	MaxValue *float64 `json:"max_value"`
	Enabled  *bool    `json:"enabled"`
}


func ThresholdsListHandler(c *fiber.Ctx) error {
	deviceID := c.Query("device_id", "")

	var thresholds []models.Threshold
	q := db.DB
	if deviceID != "" {
		q = q.Where("device_id = ?", deviceID)
	}
	q.Find(&thresholds)

	return c.JSON(fiber.Map{
		"count":      len(thresholds),
		"thresholds": thresholds,
	})
}


func ThresholdsCreateHandler(c *fiber.Ctx) error {
	var req thresholdRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if req.DeviceID == "" || req.Metric == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "device_id and metric are required"})
	}

	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	t := models.Threshold{
		DeviceID: req.DeviceID,
		Metric:   req.Metric,
		Label:    req.Label,
		MinValue: req.MinValue,
		MaxValue: req.MaxValue,
		Enabled:  enabled,
	}

	if result := db.DB.Create(&t); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": result.Error.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(t)
}


func ThresholdsUpdateHandler(c *fiber.Ctx) error {
	id := c.Params("id")

	var t models.Threshold
	if result := db.DB.First(&t, id); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "threshold not found"})
	}

	var req thresholdRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if req.Label != "" {
		t.Label = req.Label
	}
	if req.MinValue != nil {
		t.MinValue = req.MinValue
	}
	if req.MaxValue != nil {
		t.MaxValue = req.MaxValue
	}
	if req.Enabled != nil {
		t.Enabled = *req.Enabled
	}

	db.DB.Save(&t)
	return c.JSON(t)
}


func ThresholdsDeleteHandler(c *fiber.Ctx) error {
	id := c.Params("id")

	var t models.Threshold
	if result := db.DB.First(&t, id); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "threshold not found"})
	}

	db.DB.Delete(&t)
	return c.JSON(fiber.Map{"ok": true})
}
