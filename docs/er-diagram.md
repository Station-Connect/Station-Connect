# Station Connect: ER Diagram

GitHub renders the diagram below automatically. Source of truth for the real tables is `database/schema.sql`.

> **Check once:** the `users` columns match `schema.sql`. The other tables follow our plan, so compare them with `schema.sql` and fix any column names that differ.

```mermaid
erDiagram
    USERS ||--o| DRIVER_PROFILES : "is a driver"
    DRIVER_PROFILES ||--o{ DRIVER_LOCATIONS : "reports"
    DRIVER_PROFILES ||--o{ RIDES : "drives"
    RIDES ||--|{ RIDE_PASSENGERS : "carries"
    USERS ||--o{ RIDE_PASSENGERS : "books as rider"
    RIDES ||--o{ PAYMENTS : "paid by"
    USERS ||--o{ PAYMENTS : "pays"
    RIDES ||--o{ RATINGS : "rated in"
    USERS ||--o{ RATINGS : "gives or receives"

    USERS {
        bigint id PK
        varchar full_name
        varchar email UK
        varchar phone UK
        varchar password_hash
        varchar role "RIDER, DRIVER, ADMIN"
        timestamptz created_at
    }
    DRIVER_PROFILES {
        bigint id PK
        bigint user_id FK
        varchar vehicle_type
        varchar vehicle_number
        varchar license_number
        varchar approval_status "PENDING, APPROVED, REJECTED"
        boolean is_online
        numeric avg_rating
    }
    DRIVER_LOCATIONS {
        bigint id PK
        bigint driver_id FK
        double latitude
        double longitude
        timestamptz updated_at
    }
    RIDES {
        bigint id PK
        bigint driver_id FK
        double pickup_lat
        double pickup_lng
        varchar pickup_address
        double drop_lat
        double drop_lng
        varchar drop_address
        varchar ride_type "SOLO, SHARED"
        varchar status "REQUESTED to COMPLETED or CANCELLED"
        numeric total_fare
        numeric distance_km
        int version "optimistic locking"
        timestamptz requested_at
    }
    RIDE_PASSENGERS {
        bigint id PK
        bigint ride_id FK
        bigint rider_id FK
        numeric fare_share
        varchar status
    }
    PAYMENTS {
        bigint id PK
        bigint ride_id FK
        bigint rider_id FK
        numeric amount
        varchar method
        varchar status
        timestamptz created_at
    }
    RATINGS {
        bigint id PK
        bigint ride_id FK
        bigint from_user_id FK
        bigint to_user_id FK
        int score
        varchar comment
    }
    FARE_RULES {
        bigint id PK
        numeric base_fare
        numeric per_km
        numeric per_minute
        numeric surge_multiplier
    }
```

## Key design decisions

- **One shared ride = one `rides` row plus several `ride_passengers` rows.** A solo ride is a ride with one passenger, so solo and pooled rides use the same tables.
- **Ride status flow:** `REQUESTED` → `ACCEPTED` → `ARRIVED` → `STARTED` → `COMPLETED` (or `CANCELLED`).
- **`rides.version`** is for optimistic locking, so two drivers cannot accept the same ride.
- **`fare_rules`** has no relations. It holds the current pricing settings the admin edits.
- **Not in the schema yet:** `sos_alerts` (SOS feature, planned for Day 17).
