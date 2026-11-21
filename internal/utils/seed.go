package utils

import (
	"crypto/rand"
	"encoding/hex"
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

func SeedTeamUsers() {
	if db.DB == nil {
		return
	}
	pw := os.Getenv("SGG_DEFAULT_PASSWORD")
	if pw == "" {
		pw = randomPassword()
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
		log.Infof("seed: created user %s (password: %s - change it via reset flow)", s.Username, pw)
	}
}

func randomPassword() string {
	b := make([]byte, 12)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
