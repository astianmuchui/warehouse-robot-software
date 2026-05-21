package api

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"

	mqttclient "github.com/astianmuchui/mobilerobot/internal/mqtt"
)

var validDriveCmds = map[string]bool{
	"forward": true, "backward": true,
	"left": true, "right": true,
	"stop": true, "brake": true,
}

var validJoints = map[string]bool{
	"base": true, "shoulder": true, "elbow": true, "gripper": true,
}

func CmdDriveHandler(c *fiber.Ctx) error {
	var body struct {
		Cmd string `json:"cmd"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if !validDriveCmds[body.Cmd] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unknown cmd: " + body.Cmd})
	}
	payload, _ := json.Marshal(map[string]string{"cmd": body.Cmd})
	if err := mqttclient.Publish("robot/cmd/drive", string(payload)); err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true, "cmd": body.Cmd})
}

func CmdArmHandler(c *fiber.Ctx) error {
	var body struct {
		Joint string  `json:"joint"`
		Angle float64 `json:"angle"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if !validJoints[body.Joint] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unknown joint: " + body.Joint})
	}
	if body.Angle < 0 || body.Angle > 180 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "angle must be 0–180"})
	}
	payload, _ := json.Marshal(map[string]interface{}{"joint": body.Joint, "angle": body.Angle})
	if err := mqttclient.Publish("robot/cmd/arm", string(payload)); err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true, "joint": body.Joint, "angle": body.Angle})
}
