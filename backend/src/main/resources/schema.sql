-- Create database schema for PostgreSQL
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS journeys (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    journey_name VARCHAR(100) NOT NULL,
    tracking_code VARCHAR(255) UNIQUE NOT NULL,
    start_lat DOUBLE PRECISION NOT NULL,
    start_lng DOUBLE PRECISION NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255),
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    start_address VARCHAR(255),
    destination_address VARCHAR(255),
    travel_mode VARCHAR(20) DEFAULT 'DRIVING',
    CONSTRAINT fk_journeys_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS location_logs (
    id UUID PRIMARY KEY,
    journey_id UUID NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_logs_journey FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_location_logs_journey ON location_logs(journey_id);
