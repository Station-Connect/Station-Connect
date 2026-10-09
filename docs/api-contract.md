# Station Connect: API Contract

The agreement between backend and Angular. If an endpoint or field changes, update this file in the same commit and tell your teammate.

- **Base URL:** `http://localhost:8080/api` (use your own port if 8080 is busy; Angular reads it from `environment.ts`)
- **Format:** JSON for every request and response
- **Auth:** JWT. Send `Authorization: Bearer <token>` on every endpoint except register and login
- **Roles:** `RIDER`, `DRIVER`, `ADMIN`
- **Ride statuses:** `REQUESTED` → `ACCEPTED` → `ARRIVED` → `STARTED` → `COMPLETED` (or `CANCELLED`)

## Standard response

Every response uses this shape.

```json
{ "success": true, "message": "Login successful", "data": { } }
```

Errors use the same shape with `"success": false`, `"data": null`, and an HTTP status (400 validation, 401 not logged in, 403 wrong role, 404 not found, 409 conflict).

## 1. Auth (public)

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| POST | `/auth/register` | `fullName, email, phone, password, role` (`RIDER` or `DRIVER`) | created user (no password) |
| POST | `/auth/login` | `email, password` | `token, role, name` |

Login response `data`:

```json
{ "token": "eyJ...", "role": "RIDER", "name": "Sahil Joshi" }
```

## 2. Rider

| Method | Endpoint | Description |
|---|---|---|
| GET | `/rider/profile` | Current rider's profile |
| PUT | `/rider/profile` | Update name or phone |
| POST | `/rides/estimate` | Body: pickup and drop lat/lng, `rideType`. Returns distance, fare estimate |
| POST | `/rides/request` | Body: pickup, drop, `rideType`. Creates a `REQUESTED` ride |
| GET | `/rides/my` | Rider's ride history |
| GET | `/rides/{id}` | One ride with status, driver, fare |
| POST | `/rides/{id}/cancel` | Cancel before the trip starts |

## 3. Driver

| Method | Endpoint | Description |
|---|---|---|
| POST | `/driver/register` | Vehicle type, number, licence. Status starts as `PENDING` |
| GET | `/driver/profile` | Driver's profile and approval status |
| PUT | `/driver/online` | Body: `{ "online": true }` |
| POST | `/driver/location` | Body: `latitude, longitude`. Sent every 5 seconds |
| POST | `/rides/{id}/accept` | Accept a request |
| POST | `/rides/{id}/reject` | Reject, so the request moves to the next driver |
| POST | `/rides/{id}/arrived` | Driver reached the pickup |
| POST | `/rides/{id}/start` | Trip started |
| POST | `/rides/{id}/complete` | Trip finished, final fare calculated |
| GET | `/driver/earnings` | Totals and trip list |

## 4. Payments and ratings

| Method | Endpoint | Description |
|---|---|---|
| POST | `/payments` | Body: `rideId, method`. Records payment (mock or Razorpay test) |
| GET | `/payments/my` | Payment history |
| POST | `/ratings` | Body: `rideId, toUserId, score (1-5), comment` |

## 5. Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/drivers/pending` | Drivers waiting for approval |
| PUT | `/admin/drivers/{id}/approve` | Approve a driver |
| PUT | `/admin/drivers/{id}/reject` | Reject a driver |
| GET | `/admin/users` | List all users |
| GET | `/admin/fare-rules` | Current fare settings |
| PUT | `/admin/fare-rules` | Body: `baseFare, perKm, perMinute, surgeMultiplier` |
| GET | `/admin/reports` | Rides per day, revenue, active drivers |

## 6. Safety (later, needs a new `sos_alerts` table)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/rides/{id}/sos` | Rider triggers an SOS alert |
| GET | `/share/{token}` | Public live-trip page (no login) |

## 7. WebSocket (STOMP)

Connect at `/ws` with the JWT. Topics:

| Topic | Who listens | Message |
|---|---|---|
| `/topic/driver/{driverId}/requests` | Driver | New ride request |
| `/topic/ride/{rideId}/status` | Rider and driver | Status changes |
| `/topic/ride/{rideId}/location` | Rider | Driver's live position |

## Who owns what (Day 2)

| Area | Owner |
|---|---|
| `User`, `UserRepository`, `AuthController`, `JwtUtil`; Angular login and register pages | Sahil Joshi |
| `JwtAuthFilter`, full `SecurityConfig`, CORS; Angular interceptor and route guards | Jagadale |
