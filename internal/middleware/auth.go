package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/astianmuchui/mobilerobot/internal/services/sessions"
)

// RequireSession redirects browsers to /login (preserving the originally
// requested path) and returns 401 JSON to API/XHR callers.
func RequireSession(c *fiber.Ctx) error {
	id := c.Cookies(sessions.CookieName)
	if id != "" {
		if s, ok := sessions.Get(id); ok {
			c.Locals("user_id", s.UserID)
			c.Locals("user_email", s.Email)
			c.Locals("user_username", s.Username)
			return c.Next()
		}
	}

	if wantsJSON(c) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthenticated"})
	}
	next := c.OriginalURL()
	if next == "" || next == "/" {
		return c.Redirect("/login", fiber.StatusFound)
	}
	return c.Redirect("/login?next="+next, fiber.StatusFound)
}

// CurrentUser is a non-blocking middleware that exposes session info to
// templates when present, without forcing redirect when absent.
func CurrentUser(c *fiber.Ctx) error {
	id := c.Cookies(sessions.CookieName)
	if id != "" {
		if s, ok := sessions.Get(id); ok {
			c.Locals("user_id", s.UserID)
			c.Locals("user_email", s.Email)
			c.Locals("user_username", s.Username)
		}
	}
	return c.Next()
}

func wantsJSON(c *fiber.Ctx) bool {
	if strings.HasPrefix(c.Path(), "/api/") {
		return true
	}
	accept := c.Get("Accept")
	return strings.Contains(accept, "application/json")
}
