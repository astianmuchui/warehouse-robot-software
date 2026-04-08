package models

import "gorm.io/gorm"


type Device struct {
	gorm.Model
	DeviceID string `gorm:"type:varchar(64);uniqueIndex;not null"`
	Firmware string `gorm:"type:varchar(32)"`
	IP       string `gorm:"type:varchar(64)"`
}
