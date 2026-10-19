
package com.stationconnect.dto;

public record FareEstimateResponse(
    double distanceKm,
    double durationMinutes,
    double baseFare,
    double distanceFare,
    double timeFare,
    double totalFare
) {}
