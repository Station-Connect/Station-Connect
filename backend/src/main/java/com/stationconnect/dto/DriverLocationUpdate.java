
package com.stationconnect.dto;

import java.time.OffsetDateTime;

public record DriverLocationUpdate(
        Long rideId,
        double latitude,
        double longitude,
        OffsetDateTime updatedAt) {
}
