# Warehouse Robot Software

Go-based web application for monitoring and managing warehouse robot telemetry, events, thresholds, and user access.

It combines:

- Fiber HTTP server
- Template-rendered web pages
- REST APIs
- MQTT connectivity
- Relational + ScyllaDB-backed persistence

This repository is part of a final year project.

## Authors

- Sebastian Muchui
- Okoth Glen Ochieng
- Gloria Mwende Ngei

## Overview

The system is organized with clear boundaries between routing, handlers, data models, storage adapters, and UI assets.

Core design goals:

- Keep telemetry ingestion and dashboard rendering independent
- Support both server-rendered pages and API-driven interactions
- Allow graceful startup even when optional integrations are unavailable

## Key Features

- Live dashboard for warehouse robot telemetry
- Telemetry ingestion and history retrieval endpoints
- IMU latest + replay support
- Event logging and browsing
- Threshold creation, update, toggle, and deletion
- User registration, authentication, verification, and password reset flows
- MQTT integration for robot communication
- ScyllaDB integration for operational telemetry/event data

## Architecture Summary

### Startup Flow

Application entry point: cmd/main.go

Initialization sequence:

1. Load environment variables
2. Connect relational database
3. Run migrations
4. Attempt ScyllaDB connection
5. Start MQTT connection asynchronously
6. Configure Fiber app, middleware, templates, and routes
7. Listen on configured HTTP port

### Why this Architecture

- Centralized bootstrap: predictable startup behavior
- Separated persistence concerns: metadata vs high-frequency telemetry
- Async MQTT startup: web app remains available during broker delays
- Hybrid UI + APIs: fast page load with flexible data access
- Internal package boundaries: easier maintenance and safer extension

## Project Structure

- cmd/ — application entry point
- internal/routes/ — route registration
- internal/handlers/ — page handlers
- internal/handlers/api/ — API handlers
- internal/models/ — relational models
- internal/scylla/ — ScyllaDB connector, types, and queries
- internal/mqtt/ — MQTT adapter and message handling
- internal/templates/ — server-rendered views
- internal/utils/ — migration, auth, and helper utilities
- assets/css/ — stylesheets
- assets/js/ — frontend logic
- cql/ — ScyllaDB schema initialization

## Main Routes

### Web UI

- / — home page
- /dashboard — robot dashboard
- /analysis — telemetry analysis
- /events — event viewer
- /thresholds — threshold configuration
- /replay — telemetry replay

### API

Base path: /api/v1

Users:

- POST /users/register
- POST /users/login
- GET /users/verify-account/:uid/:token
- PATCH /users/reset-password/

Telemetry:

- GET /telemetry/latest
- GET /telemetry/history
- GET /telemetry/imu/latest
- GET /telemetry/imu/replay
- POST /telemetry/ingest

Events:

- GET /events

Thresholds:

- GET /thresholds
- POST /thresholds
- PATCH /thresholds/:id
- DELETE /thresholds/:id

## Technology Stack

- Go 1.24+
- Fiber (HTTP framework)
- GORM (ORM)
- SQLite (local relational persistence)
- PostgreSQL driver support (production-oriented)
- ScyllaDB (telemetry/event storage)
- Eclipse Paho MQTT client
- Fiber HTML template engine
- Docker Compose (local services)

## Configuration

Environment is loaded from .env at startup.

Important variables include:

- SGG_ENVIRONMENT
- SGG_PORT
- SGG_POSTGRES_DSN
- SGG_MQTT_BROKER
- SGG_MQTT_PORT
- SGG_MQTT_USERNAME
- SGG_MQTT_PASSWORD
- SGG_MQTT_CLIENT_ID
- SGG_CASSANDRA_HOST
- SGG_CASSANDRA_PORT
- SGG_CASSANDRA_KEYSPACE
- SGG_CASSANDRA_USERNAME
- SGG_CASSANDRA_PASSWORD

## Running Locally

### Prerequisites

- Go installed
- Docker + Docker Compose (recommended for local services)

### 1) Start supporting services

```bash
docker compose up -d
```

### 2) Run the app

```bash
go run ./cmd/main.go
```

### 3) Open in browser

- [http://localhost:8092](http://localhost:8092) (or your configured SGG_PORT)

## Build

```bash
go build ./cmd/main.go
```

## Local Development Notes

- Static assets are served from /assets
- Templates are loaded from internal/templates
- ScyllaDB connection failure is handled gracefully
- MQTT startup is asynchronous to avoid blocking web startup
