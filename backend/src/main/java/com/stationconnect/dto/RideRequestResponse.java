
package com.stationconnect.dto;

import com.stationconnect.entity.Ride;
import java.util.List;

public record RideRequestResponse(
        Ride ride,
        List<NearbyDriverResponse> nearbyDrivers
) {
}
