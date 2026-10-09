
-- Station Connect: Initial PostgreSQL schema

CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL
        CHECK (role IN ('RIDER', 'DRIVER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE driver_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id),
    vehicle_type VARCHAR(50) NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL UNIQUE,
    document_url TEXT,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (verification_status IN
            ('PENDING', 'APPROVED', 'REJECTED')),
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    average_rating NUMERIC(3,2)
        CHECK (average_rating BETWEEN 0 AND 5)
);

CREATE TABLE rides (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    requested_by BIGINT NOT NULL REFERENCES users(id),
    driver_id BIGINT REFERENCES driver_profiles(user_id),

    pickup_address TEXT NOT NULL,
    pickup_lat DOUBLE PRECISION NOT NULL
        CHECK (pickup_lat BETWEEN -90 AND 90),
    pickup_lng DOUBLE PRECISION NOT NULL
        CHECK (pickup_lng BETWEEN -180 AND 180),

    drop_address TEXT NOT NULL,
    drop_lat DOUBLE PRECISION NOT NULL
        CHECK (drop_lat BETWEEN -90 AND 90),
    drop_lng DOUBLE PRECISION NOT NULL
        CHECK (drop_lng BETWEEN -180 AND 180),

    ride_type VARCHAR(10) NOT NULL
        CHECK (ride_type IN ('SOLO', 'SHARED')),
    status VARCHAR(15) NOT NULL DEFAULT 'REQUESTED'
        CHECK (status IN (
            'REQUESTED', 'ACCEPTED', 'ARRIVED',
            'STARTED', 'COMPLETED', 'CANCELLED'
        )),

    estimated_fare NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (estimated_fare >= 0),
    final_fare NUMERIC(10,2)
        CHECK (final_fare IS NULL OR final_fare >= 0),

    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE TABLE ride_passengers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ride_id BIGINT NOT NULL REFERENCES rides(id),
    passenger_id BIGINT NOT NULL REFERENCES users(id),
    fare_share NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (fare_share >= 0),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ride_id, passenger_id)
);

CREATE TABLE payments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ride_id BIGINT NOT NULL REFERENCES rides(id),
    payer_id BIGINT NOT NULL REFERENCES users(id),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) NOT NULL
        CHECK (payment_method IN ('MOCK', 'RAZORPAY')),
    status VARCHAR(15) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
    transaction_reference VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ratings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ride_id BIGINT NOT NULL REFERENCES rides(id),
    reviewer_id BIGINT NOT NULL REFERENCES users(id),
    reviewee_id BIGINT NOT NULL REFERENCES users(id),
    score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (reviewer_id <> reviewee_id),
    UNIQUE (ride_id, reviewer_id, reviewee_id)
);

-- One current location per driver; update it as the driver moves.
CREATE TABLE driver_locations (
    driver_id BIGINT PRIMARY KEY REFERENCES driver_profiles(user_id),
    latitude DOUBLE PRECISION NOT NULL
        CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL
        CHECK (longitude BETWEEN -180 AND 180),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fare_rules (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    base_fare NUMERIC(10,2) NOT NULL CHECK (base_fare >= 0),
    per_km NUMERIC(10,2) NOT NULL CHECK (per_km >= 0),
    per_minute NUMERIC(10,2) NOT NULL CHECK (per_minute >= 0),
    surge_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.00
        CHECK (surge_multiplier >= 1.00),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Common lookup indexes
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_driver_status ON rides(driver_id, status);
CREATE INDEX idx_rides_requested_by ON rides(requested_by);
CREATE INDEX idx_ride_passengers_passenger
    ON ride_passengers(passenger_id);
CREATE INDEX idx_payments_ride ON payments(ride_id);
CREATE INDEX idx_ratings_reviewee ON ratings(reviewee_id);
