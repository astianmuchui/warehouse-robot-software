package scylla

import (
	"fmt"

	"github.com/astianmuchui/mobilerobot/internal/env"
	"github.com/gocql/gocql"
)

var Session *gocql.Session

func Connect() (*gocql.Session, error) {
	fmt.Println("Connecting to ScyllaDB...")

	cluster := gocql.NewCluster(env.GetCassandraHost())
	cluster.Port = env.GetCassandraPort()
	cluster.Keyspace = env.GetCassandraKeyspace()
	cluster.Consistency = gocql.Quorum

	username := env.GetCassandraUsername()
	password := env.GetCassandraPassword()
	if username != "" {
		cluster.Authenticator = gocql.PasswordAuthenticator{
			Username: username,
			Password: password,
		}
	}

	session, err := cluster.CreateSession()
	if err != nil {
		return nil, fmt.Errorf("scylladb connect: %w", err)
	}

	fmt.Println("Connected to ScyllaDB")
	Session = session
	return session, nil
}
