package routes

import (
	"github.com/gofiber/fiber/v2"

	pageapi "github.com/astianmuchui/mobilerobot/internal/handlers/api"
	"github.com/astianmuchui/mobilerobot/internal/handlers"
)

func GetRoutes(app *fiber.App) {

	
	app.Get("/", handlers.HomeHandler)
	app.Get("/dashboard", handlers.DashboardHandler)
	app.Get("/analysis", handlers.AnalysisHandler)
	app.Get("/events", handlers.EventsHandler)
	app.Get("/thresholds", handlers.ThresholdsHandler)
	app.Get("/replay", handlers.ReplayHandler)

	
	app.Route("/api/v1", func(v1 fiber.Router) {

		
		v1.Route("/users", func(users fiber.Router) {
			users.Post("/register", pageapi.UserApiRegisterHandler)
			users.Post("/login", pageapi.UserApiLoginHandler)
			users.Get("/verify-account/:uid/:token", pageapi.UserApiVerifyAccountHandler)
			users.Patch("/reset-password/", pageapi.UserApiResetPasswordHandler)
		})

		
		v1.Get("/telemetry/latest", pageapi.TelemetryLatestHandler)
		v1.Get("/telemetry/history", pageapi.TelemetryHistoryHandler)
		v1.Get("/telemetry/imu/latest", pageapi.TelemetryIMUHandler)
		v1.Get("/telemetry/imu/replay", pageapi.TelemetryIMUReplayHandler)
		v1.Post("/telemetry/ingest", pageapi.TelemetryIngestHandler)

		
		v1.Get("/events", pageapi.EventsAPIHandler)

		
		v1.Get("/thresholds", pageapi.ThresholdsListHandler)
		v1.Post("/thresholds", pageapi.ThresholdsCreateHandler)
		v1.Patch("/thresholds/:id", pageapi.ThresholdsUpdateHandler)
		v1.Delete("/thresholds/:id", pageapi.ThresholdsDeleteHandler)
	})
}
