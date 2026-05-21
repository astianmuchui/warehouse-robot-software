package utils

import (
	"os"

	"github.com/gofiber/fiber/v2/log"
	"github.com/google/uuid"

	"github.com/astianmuchui/mobilerobot/internal/db"
	"github.com/astianmuchui/mobilerobot/internal/models"
)

type seedSpec struct {
	FirstName string
	LastName  string
	Username  string
	Email     string
	Phone     string
}

var seedUsers = []seedSpec{
	{"Sebastian", "Muchui", "astianmuchui", "sebastian@sgg.local", "+254000000001"},
	{"Gloria",    "Ngei",   "gngei",        "gloria@sgg.local",    "+254000000002"},
	{"Glen",      "Okoth",  "glenochieng",  "glen@sgg.local",      "+254000000003"},
}

// SeedTeamUsers ensures the three SGG accounts exist. Default password is read
// from SGG_DEFAULT_PASSWORD (or falls back to a baked default). When a user is
// newly created, the password is logged so the team can sign in.
func SeedTeamUsers() {
	if db.DB == nil {
		return
	}
	pw := os.Getenv("SGG_DEFAULT_PASSWORD")
	if pw == "" {
		pw = "sgg-robot-2026"
	}
	hashed := PasswordHash([]byte(pw))

	for _, s := range seedUsers {
		var existing models.User
		err := db.DB.Where("username = ? OR email = ?", s.Username, s.Email).First(&existing).Error
		if err == nil {
			continue
		}

		u := models.User{
			Uuid:        uuid.New(),
			FirstName:   s.FirstName,
			LastName:    s.LastName,
			Username:    s.Username,
			Email:       s.Email,
			PhoneNumber: s.Phone,
			Password:    hashed,
		}
		if err := db.DB.Create(&u).Error; err != nil {
			log.Warnf("seed: could not create %s: %v", s.Username, err)
			continue
		}
		log.Infof("seed: created user %s (password: %s — change it via reset flow)", s.Username, pw)
	}
}
