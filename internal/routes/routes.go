package routes

import (
    "github.com/gofiber/fiber/v2"

    "github.com/astianmuchui/mobilerobot/internal/handlers/api"
    "github.com/astianmuchui/mobilerobot/internal/handlers"
)

func GetRoutes(app *fiber.App) {

    app.Get("/", handlers.HomeHandler)

    app.Route("/api/v1", func(v1 fiber.Router) {

        v1.Route("/users", func(users fiber.Router) {

            users.Post("/register", api.UserApiRegisterHandler)

            users.Post("/login", api.UserApiLoginHandler)
            users.Get("/verify-account/:uid/:token", api.UserApiVerifyAccountHandler)
            users.Patch("/reset-password/", api.UserApiResetPasswordHandler)

        })

    })
}
