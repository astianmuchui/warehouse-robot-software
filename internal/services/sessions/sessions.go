package sessions

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

type Session struct {
	UserID    uint
	Email     string
	Username  string
	CreatedAt time.Time
	ExpiresAt time.Time
}

const (
	CookieName     = "sgg_session"
	defaultTTL     = 14 * 24 * time.Hour
	cleanupEvery   = 1 * time.Hour
)

var (
	mu    sync.RWMutex
	store = map[string]Session{}
)

func init() {
	go func() {
		t := time.NewTicker(cleanupEvery)
		defer t.Stop()
		for range t.C {
			cleanup()
		}
	}()
}

func newID() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func Create(userID uint, email, username string) (string, time.Time, error) {
	id, err := newID()
	if err != nil {
		return "", time.Time{}, err
	}
	now := time.Now().UTC()
	sess := Session{
		UserID:    userID,
		Email:     email,
		Username:  username,
		CreatedAt: now,
		ExpiresAt: now.Add(defaultTTL),
	}
	mu.Lock()
	store[id] = sess
	mu.Unlock()
	return id, sess.ExpiresAt, nil
}

func Get(id string) (Session, bool) {
	mu.RLock()
	s, ok := store[id]
	mu.RUnlock()
	if !ok {
		return Session{}, false
	}
	if time.Now().UTC().After(s.ExpiresAt) {
		Delete(id)
		return Session{}, false
	}
	return s, true
}

func Delete(id string) {
	mu.Lock()
	delete(store, id)
	mu.Unlock()
}

func cleanup() {
	now := time.Now().UTC()
	mu.Lock()
	for id, s := range store {
		if now.After(s.ExpiresAt) {
			delete(store, id)
		}
	}
	mu.Unlock()
}
