package scylla

import (
	"fmt"
	"sync/atomic"
	"time"

	"github.com/astianmuchui/mobilerobot/internal/env"
	"github.com/gocql/gocql"
)

var Session *gocql.Session

var reconnecting atomic.Bool

func dial() (*gocql.Session, error) {
	cluster := gocql.NewCluster(env.GetCassandraHost())
	cluster.Port = env.GetCassandraPort()
	cluster.Keyspace = env.GetCassandraKeyspace()
	cluster.Consistency = gocql.Quorum
	cluster.ConnectTimeout = 5 * time.Second
	cluster.Timeout = 5 * time.Second

	username := env.GetCassandraUsername()
	password := env.GetCassandraPassword()
	if username != "" {
		cluster.Authenticator = gocql.PasswordAuthenticator{
			Username: username,
			Password: password,
		}
	}

	return cluster.CreateSession()
}

func Connect() (*gocql.Session, error) {
	fmt.Println("Connecting to ScyllaDB...")

	var lastErr error
	for attempt := 1; attempt <= 6; attempt++ {
		session, err := dial()
		if err == nil {
			fmt.Println("Connected to ScyllaDB")
			Session = session
			return session, nil
		}
		lastErr = err
		fmt.Printf("ScyllaDB connect attempt %d failed: %v\n", attempt, err)
		time.Sleep(time.Duration(attempt) * 2 * time.Second)
	}

	// Give up the synchronous attempt, but keep trying in the background so
	// the API recovers automatically once Scylla becomes reachable.
	go reconnectLoop()
	return nil, fmt.Errorf("scylladb connect: %w", lastErr)
}

func reconnectLoop() {
	if !reconnecting.CompareAndSwap(false, true) {
		return
	}
	defer reconnecting.Store(false)

	for {
		time.Sleep(15 * time.Second)
		if Session != nil {
			return
		}
		session, err := dial()
		if err != nil {
			fmt.Printf("ScyllaDB background reconnect failed: %v\n", err)
			continue
		}
		fmt.Println("Connected to ScyllaDB (background reconnect)")
		Session = session
		return
	}
}
