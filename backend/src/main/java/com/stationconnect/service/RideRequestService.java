
package com.stationconnect.service;

import com.stationconnect.dto.FareEstimateRequest;
import com.stationconnect.dto.FareEstimateResponse;
import com.stationconnect.dto.NearbyDriverResponse;
import com.stationconnect.dto.RideRequest;
import com.stationconnect.dto.RideRequestResponse;
import com.stationconnect.entity.DriverLocation;
import com.stationconnect.entity.DriverProfile;
import com.stationconnect.entity.Ride;
import com.stationconnect.entity.Role;
import com.stationconnect.entity.User;
import com.stationconnect.exception.ApiException;
import com.stationconnect.repository.DriverLocationRepository;
import com.stationconnect.repository.DriverProfileRepository;
import com.stationconnect.repository.RideRepository;
import com.stationconnect.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class RideRequestService {

    private static final double SEARCH_RADIUS_KM = 10.0;
    private static final long LOCATION_MAX_AGE_MINUTES = 5;

    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final DriverLocationRepository driverLocationRepository;
    private final FareService fareService;

    public RideRequestService(
            RideRepository rideRepository,
            UserRepository userRepository,
            DriverProfileRepository driverProfileRepository,
            DriverLocationRepository driverLocationRepository,
            FareService fareService) {
        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
        this.driverProfileRepository = driverProfileRepository;
        this.driverLocationRepository = driverLocationRepository;
        this.fareService = fareService;
    }

    @Transactional
    public RideRequestResponse requestRide(
            String email,
            RideRequest request) {

        if (request == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Ride request cannot be empty");
        }

        User user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "User not found"));

        if (user.getRole() != Role.RIDER) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Only riders can request rides");
        }

        validateRequest(request);

        FareEstimateResponse fare = fareService.estimateFare(
                new FareEstimateRequest(
                        request.pickupLatitude(),
                        request.pickupLongitude(),
                        request.dropLatitude(),
                        request.dropLongitude()));

        Ride ride = new Ride();
        ride.setRequestedBy(user.getId());
        ride.setPickupAddress(request.pickupAddress().trim());
        ride.setPickupLat(request.pickupLatitude());
        ride.setPickupLng(request.pickupLongitude());
        ride.setDropAddress(request.dropAddress().trim());
        ride.setDropLat(request.dropLatitude());
        ride.setDropLng(request.dropLongitude());
        ride.setRideType(request.rideType().trim().toUpperCase(Locale.ROOT));
        ride.setStatus("REQUESTED");
        ride.setEstimatedFare(
                BigDecimal.valueOf(fare.totalFare()));
        ride.setDriverId(null);

        Ride savedRide = rideRepository.save(ride);

        List<NearbyDriverResponse> nearbyDrivers =
                findNearbyDrivers(
                        request.pickupLatitude(),
                        request.pickupLongitude());

        return new RideRequestResponse(savedRide, nearbyDrivers);
    }

    private List<NearbyDriverResponse> findNearbyDrivers(
            double pickupLatitude,
            double pickupLongitude) {

        OffsetDateTime cutoff = OffsetDateTime.now()
                .minusMinutes(LOCATION_MAX_AGE_MINUTES);

        List<DriverProfile> eligibleProfiles =
                driverProfileRepository
                        .findByVerificationStatusAndOnlineTrue(
                                DriverProfile.VerificationStatus.APPROVED);

        if (eligibleProfiles.isEmpty()) {
            return List.of();
        }

        List<Long> driverIds = eligibleProfiles.stream()
                .map(DriverProfile::getUserId)
                .toList();

        Map<Long, DriverLocation> locations =
                driverLocationRepository
                        .findByDriverIdIn(driverIds)
                        .stream()
                        .filter(location ->
                                location.getUpdatedAt() != null
                                && !location.getUpdatedAt().isBefore(cutoff))
                        .collect(Collectors.toMap(
                                DriverLocation::getDriverId,
                                Function.identity(),
                                (first, second) ->
                                        first.getUpdatedAt()
                                                .isAfter(second.getUpdatedAt())
                                                ? first : second));

        return locations.values().stream()
                .map(location -> new NearbyDriverResponse(
                        location.getDriverId(),
                        distanceKm(
                                pickupLatitude,
                                pickupLongitude,
                                location.getLatitude(),
                                location.getLongitude())))
                .filter(driver ->
                        driver.distanceKm() <= SEARCH_RADIUS_KM)
                .sorted(Comparator.comparingDouble(
                        NearbyDriverResponse::distanceKm))
                .toList();
    }

    private void validateRequest(RideRequest request) {
        if (request.pickupAddress() == null
                || request.pickupAddress().isBlank()
                || request.dropAddress() == null
                || request.dropAddress().isBlank()
                || request.rideType() == null
                || request.rideType().isBlank()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Pickup, drop-off and ride type are required");
        }

        if (!validLatitude(request.pickupLatitude())
                || !validLatitude(request.dropLatitude())
                || !validLongitude(request.pickupLongitude())
                || !validLongitude(request.dropLongitude())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid pickup or drop-off coordinates");
        }
    }

    private boolean validLatitude(Double value) {
        return value != null && Double.isFinite(value)
                && value >= -90 && value <= 90;
    }

    private boolean validLongitude(Double value) {
        return value != null && Double.isFinite(value)
                && value >= -180 && value <= 180;
    }

    private double distanceKm(
            double lat1,
            double lon1,
            double lat2,
            double lon2) {

        double earthRadiusKm = 6371.0;

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2)
                * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2)
                * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(
                Math.sqrt(a), Math.sqrt(1 - a));

        return Math.round(earthRadiusKm * c * 100.0) / 100.0;
    }
}
