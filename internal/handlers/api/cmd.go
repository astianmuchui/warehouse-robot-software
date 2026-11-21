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
		Cmd   string `json:"cmd"`
		Speed *int   `json:"speed"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if !validDriveCmds[body.Cmd] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unknown cmd: " + body.Cmd})
	}

	msg := map[string]interface{}{"cmd": body.Cmd}
	if body.Speed != nil {
		s := *body.Speed
		if s < 0 {
			s = 0
		} else if s > 100 {
			s = 100
		}
		msg["speed"] = s
	}
	payload, _ := json.Marshal(msg)
	if err := mqttclient.Publish("robot/cmd/drive", string(payload)); err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true, "cmd": body.Cmd})
}

func CmdArmHandler(c *fiber.Ctx) error {
	var body struct {
		Joint string  `json:"joint"`
		Angle float64 `json:"angle"`
		Hold  bool    `json:"hold"`
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
	msg := map[string]interface{}{"joint": body.Joint, "angle": body.Angle, "hold": body.Hold}
	payload, _ := json.Marshal(msg)
	if err := mqttclient.Publish("robot/cmd/arm", string(payload)); err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true, "joint": body.Joint, "angle": body.Angle, "hold": body.Hold})
}

func CmdPoseHandler(c *fiber.Ctx) error {
	var body struct {
		X       float64 `json:"x"`
		Y       float64 `json:"y"`
		Z       float64 `json:"z"`
		Gripper *int    `json:"gripper"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	gripper := -1
	if body.Gripper != nil {
		gripper = *body.Gripper
		if gripper < -1 || gripper > 180 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "gripper must be -1 or 0–180"})
		}
	}

	payload, _ := json.Marshal(map[string]interface{}{
		"x": body.X, "y": body.Y, "z": body.Z, "gripper": gripper,
	})
	if err := mqttclient.Publish("robot/cmd/pose", string(payload)); err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true, "x": body.X, "y": body.Y, "z": body.Z, "gripper": gripper})
}
