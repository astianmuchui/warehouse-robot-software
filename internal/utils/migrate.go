package utils

import (
    "github.com/astianmuchui/mobilerobot/internal/db"
    "github.com/astianmuchui/mobilerobot/internal/models"
)

func RunMigrations() {
    db.DB.AutoMigrate(
        &models.User{},
        &models.Device{},
        &models.Threshold{},
    )
}
