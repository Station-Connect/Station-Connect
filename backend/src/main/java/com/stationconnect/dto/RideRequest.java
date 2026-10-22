
package com.stationconnect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RideRequest(
        @NotBlank String pickupAddress,
        @NotNull Double pickupLatitude,
        @NotNull Double pickupLongitude,
        @NotBlank String dropAddress,
        @NotNull Double dropLatitude,
        @NotNull Double dropLongitude,
        @NotBlank String rideType
) {
}
