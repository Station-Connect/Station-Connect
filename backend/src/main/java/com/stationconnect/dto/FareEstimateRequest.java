
package com.stationconnect.dto;

public record FareEstimateRequest(
    double pickupLatitude,
    double pickupLongitude,
    double dropLatitude,
    double dropLongitude
) {}
