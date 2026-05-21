package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/astianmuchui/mobilerobot/internal/db"
	"github.com/astianmuchui/mobilerobot/internal/models"
	"github.com/astianmuchui/mobilerobot/internal/services/sessions"
	"github.com/astianmuchui/mobilerobot/internal/utils"
)

func LoginPageHandler(c *fiber.Ctx) error {
	// Already signed in? Skip the form.
	if id := c.Cookies(sessions.CookieName); id != "" {
		if _, ok := sessions.Get(id); ok {
			return c.Redirect(safeNext(c.Query("next", "/dashboard")), fiber.StatusFound)
		}
	}
	return c.Render("login", fiber.Map{
		"Title": "Sign in",
		"Next":  safeNext(c.Query("next", "")),
		"Error": "",
	})
}

func LoginPostHandler(c *fiber.Ctx) error {
	identifier := strings.TrimSpace(c.FormValue("identifier"))
	password := c.FormValue("password")
	next := safeNext(c.FormValue("next"))

	if identifier == "" || password == "" {
		return c.Status(fiber.StatusBadRequest).Render("login", fiber.Map{
			"Title": "Sign in",
			"Next":  next,
			"Error": "Enter your username/email and password.",
		})
	}

	if db.DB == nil {
		return c.Status(fiber.StatusServiceUnavailable).Render("login", fiber.Map{
			"Title": "Sign in",
			"Next":  next,
			"Error": "Auth backend unavailable.",
		})
	}

	var user models.User
	q := db.DB.Model(models.User{}).
		Where("email = ? OR username = ? OR phone_number = ?", identifier, identifier, identifier).
		First(&user)
	if q.Error != nil {
		return c.Status(fiber.StatusUnauthorized).Render("login", fiber.Map{
			"Title": "Sign in",
			"Next":  next,
			"Error": "Invalid credentials.",
		})
	}

	if !utils.PasswordVerify(user.Password, []byte(password)) {
		return c.Status(fiber.StatusUnauthorized).Render("login", fiber.Map{
			"Title": "Sign in",
			"Next":  next,
			"Error": "Invalid credentials.",
		})
	}

	sid, expires, err := sessions.Create(user.ID, user.Email, user.Username)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).Render("login", fiber.Map{
			"Title": "Sign in",
			"Next":  next,
			"Error": "Could not start session.",
		})
	}

	c.Cookie(&fiber.Cookie{
		Name:     sessions.CookieName,
		Value:    sid,
		Path:     "/",
		Expires:  expires,
		HTTPOnly: true,
		SameSite: "Lax",
	})

	if next == "" {
		next = "/dashboard"
	}
	return c.Redirect(next, fiber.StatusFound)
}

func LogoutHandler(c *fiber.Ctx) error {
	if id := c.Cookies(sessions.CookieName); id != "" {
		sessions.Delete(id)
	}
	c.Cookie(&fiber.Cookie{
		Name:     sessions.CookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Now().Add(-time.Hour),
		HTTPOnly: true,
		SameSite: "Lax",
	})
	return c.Redirect("/", fiber.StatusFound)
}

// safeNext only allows local paths (no scheme, no host) to prevent open
// redirects through the ?next=… query.
func safeNext(s string) string {
	if s == "" {
		return ""
	}
	if !strings.HasPrefix(s, "/") || strings.HasPrefix(s, "//") {
		return ""
	}
	return s
}
