package models

import "gorm.io/gorm"

type Threshold struct {
	gorm.Model
	DeviceID string   `gorm:"type:varchar(64);not null;index"`
	Metric   string   `gorm:"type:varchar(64);not null"` // e.g. "temperature"
	Label    string   `gorm:"type:varchar(128)"`         // human friendly, e.g. "Over-temperature"
	MinValue *float64 `gorm:"default:null"`
	MaxValue *float64 `gorm:"default:null"`
	Enabled  bool     `gorm:"default:true"`
}
