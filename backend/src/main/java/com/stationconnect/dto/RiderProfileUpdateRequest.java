package com.stationconnect.dto;

public record RiderProfileUpdateRequest(
        String defaultPickupLocation,
        String preferredPaymentMethod
) {
}