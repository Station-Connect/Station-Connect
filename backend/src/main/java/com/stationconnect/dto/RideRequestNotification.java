
package com.stationconnect.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record RideRequestNotification(
        Long rideId,
        String pickupAddress,
        String dropAddress,
        String rideType,
        BigDecimal estimatedFare,
        double distanceKm,
        OffsetDateTime requestedAt
) {
}
