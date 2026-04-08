package main

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/log"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/template/html/v2"

	"github.com/astianmuchui/mobilerobot/internal/db"
	"github.com/astianmuchui/mobilerobot/internal/env"
	"github.com/astianmuchui/mobilerobot/internal/mqtt"
	"github.com/astianmuchui/mobilerobot/internal/routes"
	"github.com/astianmuchui/mobilerobot/internal/scylla"
	"github.com/astianmuchui/mobilerobot/internal/utils"
)

func init() {
	env.Load()
	db.Connect()
	utils.RunMigrations()
}

func main() {


	if _, err := scylla.Connect(); err != nil {
		log.Warnf("ScyllaDB unavailable: %v — telemetry storage disabled", err)
	}


	go func() {
		time.Sleep(500 * time.Millisecond)
		mqtt.Connect()
	}()

	engine := html.New("./internal/templates", ".django")
	engine.AddFunc("deref", func(p *float64) float64 {
		if p == nil {
			return 0
		}
		return *p
	})

	app := fiber.New(fiber.Config{
		Prefork:      false,
		ServerHeader: "SGG",
		AppName:      "SGG Warehouse Robot",
		Views:        engine,
	})

	app.Static("/assets", "./assets")

	app.Use(logger.New())
	app.Use(recover.New())
	app.Use(cors.New())

	routes.GetRoutes(app)

	listenPort, err := env.GetHttpListenPort()
	if err != nil {
		log.Errorf("Could not read HTTP port: %v — using default %d", err, env.DEFAULT_PORT)
		listenPort = env.DEFAULT_PORT
	}

	address := fmt.Sprintf(":%d", listenPort)
	log.Fatal(app.Listen(address))
}
