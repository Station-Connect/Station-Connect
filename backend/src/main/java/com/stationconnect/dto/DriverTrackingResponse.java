
package com.stationconnect.dto;

import java.time.OffsetDateTime;

public record DriverTrackingResponse(
        Long rideId,
        String rideStatus,
        Long driverId,
        Double latitude,
        Double longitude,
        OffsetDateTime locationUpdatedAt
) {
}
