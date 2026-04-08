package env

/*
	Will Determine whether the user is in a local or prod env
	Will also set defaults
*/

import (
    "fmt"
    "os"
    "strconv"

    "github.com/gofiber/fiber/v2/log"
    "github.com/joho/godotenv"
)

const (
    LOCAL      = "Local"
    PRODUCTION = "Production"

    DEFAULT_PORT = 8080
)

func Load() {

    cwd, stat_err := os.Getwd()
    if stat_err != nil {
        log.Errorf("Stat Error: %v", stat_err)
    }

    parentEnvPath := cwd + "/.env"
    log.Info("Reading env from: ", parentEnvPath)
    env_err := godotenv.Load(parentEnvPath)
    if env_err != nil {
        log.Errorf("Unable to Load Environment Variables from %s: %v", parentEnvPath, env_err)
    }
}

func GetHttpListenPort() (int, error) {
    var NexThingsEnvPort string = os.Getenv("SGG_PORT")
    Port, convErr := strconv.Atoi(NexThingsEnvPort)

    if convErr != nil {
        log.Errorf("Error converting ENV Port to integer: %v", convErr)
        return DEFAULT_PORT, convErr
    }
    return Port, nil
}

/**
Returns whether the app is running in local or production environments
*/

func GetWorkingEnvironment() string {
    env := os.Getenv("SGG_ENVIRONMENT")

    if env == "Local" {
        return LOCAL
    } else if env == "Production" {
        return PRODUCTION
    } else {
        return LOCAL
    }
}

func GetDatabaseDSN() (string, error) {
    dsn := os.Getenv("SGG_POSTGRES_DSN")

    if dsn == "" {
        return "", fmt.Errorf("unable to get DSN")
    }

    return dsn, nil
}

func GetSenderEmail() (string, error) {
    email := os.Getenv("SGG_EMAIL_FROM")

    if email == "" {
        return "", fmt.Errorf("unable to get Email")
    }

    return email, nil
}

func GetAppPassword() (string, error) {
    app_password := os.Getenv("SGG_EMAIL_APP_PASSWORD")

    if app_password == "" {
        return "", fmt.Errorf("unable to get app password")
    }

    return app_password, nil
}

// MQTT

func GetMQTTBroker() string {
    v := os.Getenv("SGG_MQTT_BROKER")
    if v == "" {
        return "localhost"
    }
    return v
}

func GetMQTTPort() int {
    v := os.Getenv("SGG_MQTT_PORT")
    p, err := strconv.Atoi(v)
    if err != nil {
        return 1883
    }
    return p
}

func GetMQTTClientID() string {
    v := os.Getenv("SGG_MQTT_CLIENT_ID")
    if v == "" {
        return "sgg_robot_"
    }
    return v
}

func GetMQTTUsername() string { return os.Getenv("SGG_MQTT_USERNAME") }
func GetMQTTPassword() string { return os.Getenv("SGG_MQTT_PASSWORD") }

// ScyllaDB

func GetCassandraHost() string {
    v := os.Getenv("SGG_CASSANDRA_HOST")
    if v == "" {
        return "localhost"
    }
    return v
}

func GetCassandraPort() int {
    v := os.Getenv("SGG_CASSANDRA_PORT")
    p, err := strconv.Atoi(v)
    if err != nil {
        return 9042
    }
    return p
}

func GetCassandraKeyspace() string {
    v := os.Getenv("SGG_CASSANDRA_KEYSPACE")
    if v == "" {
        return "sgg_warehouse"
    }
    return v
}

func GetCassandraUsername() string { return os.Getenv("SGG_CASSANDRA_USERNAME") }
func GetCassandraPassword() string { return os.Getenv("SGG_CASSANDRA_PASSWORD") }
