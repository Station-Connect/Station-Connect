
package com.stationconnect.service;

import com.stationconnect.dto.FareEstimateRequest;
import com.stationconnect.dto.FareEstimateResponse;
import com.stationconnect.dto.NearbyDriverResponse;
import com.stationconnect.dto.RideRequest;
import com.stationconnect.dto.RideRequestNotification;
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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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

    private static final Logger log =
            LoggerFactory.getLogger(RideRequestService.class);

    private static final double SEARCH_RADIUS_KM = 10.0;
    private static final long LOCATION_MAX_AGE_MINUTES = 5;

    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final DriverLocationRepository driverLocationRepository;
    private final FareService fareService;
    private final SimpMessagingTemplate messagingTemplate;

    public RideRequestService(
            RideRepository rideRepository,
            UserRepository userRepository,
            DriverProfileRepository driverProfileRepository,
            DriverLocationRepository driverLocationRepository,
            FareService fareService,
            SimpMessagingTemplate messagingTemplate) {

        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
        this.driverProfileRepository = driverProfileRepository;
        this.driverLocationRepository = driverLocationRepository;
        this.fareService = fareService;
        this.messagingTemplate = messagingTemplate;
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

        String normalizedEmail = email == null
                ? ""
                : email.trim().toLowerCase(Locale.ROOT);

        User rider = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "User not found"));

        if (rider.getRole() != Role.RIDER) {
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
        ride.setRequestedBy(rider.getId());
        ride.setPickupAddress(request.pickupAddress().trim());
        ride.setPickupLat(request.pickupLatitude());
        ride.setPickupLng(request.pickupLongitude());
        ride.setDropAddress(request.dropAddress().trim());
        ride.setDropLat(request.dropLatitude());
        ride.setDropLng(request.dropLongitude());
        ride.setRideType(
                request.rideType().trim().toUpperCase(Locale.ROOT));
        ride.setStatus("REQUESTED");
        ride.setEstimatedFare(
                BigDecimal.valueOf(fare.totalFare()));
        ride.setDriverId(null);

        Ride savedRide = rideRepository.save(ride);

        List<NearbyDriverResponse> nearbyDrivers =
                findNearbyDrivers(
                        request.pickupLatitude(),
                        request.pickupLongitude());

        if (!nearbyDrivers.isEmpty()) {
            OffsetDateTime requestedAt = OffsetDateTime.now();

            if (TransactionSynchronizationManager
                    .isSynchronizationActive()) {

                TransactionSynchronizationManager.registerSynchronization(
                        new TransactionSynchronization() {
                            @Override
                            public void afterCommit() {
                                sendRideRequestNotifications(
                                        savedRide,
                                        nearbyDrivers,
                                        requestedAt);
                            }
                        });

                log.info(
                        "Scheduled notifications for rideId={} to {} nearby drivers after commit",
                        savedRide.getId(),
                        nearbyDrivers.size());

            } else {
                log.warn(
                        "No active transaction synchronization for rideId={}; sending notifications immediately",
                        savedRide.getId());

                sendRideRequestNotifications(
                        savedRide,
                        nearbyDrivers,
                        requestedAt);
            }
        } else {
            log.info(
                    "No eligible nearby drivers found for rideId={}",
                    savedRide.getId());
        }

        return new RideRequestResponse(savedRide, nearbyDrivers);
    }

    private void sendRideRequestNotifications(
            Ride ride,
            List<NearbyDriverResponse> nearbyDrivers,
            OffsetDateTime requestedAt) {

        log.info(
                "Preparing ride notification: rideId={}, nearbyDrivers={}",
                ride.getId(),
                nearbyDrivers.size());

        for (NearbyDriverResponse nearbyDriver : nearbyDrivers) {
            try {
                User driver = userRepository.findById(
                        nearbyDriver.driverId())
                        .orElse(null);

                if (driver == null) {
                    log.warn(
                            "Cannot notify driverId={}: user not found",
                            nearbyDriver.driverId());
                    continue;
                }

                if (driver.getEmail() == null
                        || driver.getEmail().isBlank()) {

                    log.warn(
                            "Cannot notify driverId={}: email is empty",
                            nearbyDriver.driverId());
                    continue;
                }

                if (driver.getRole() != Role.DRIVER) {
                    log.warn(
                            "Cannot notify userId={}: role is {}",
                            driver.getId(),
                            driver.getRole());
                    continue;
                }

                String recipient = driver.getEmail()
                        .trim()
                        .toLowerCase(Locale.ROOT);

                RideRequestNotification notification =
                        new RideRequestNotification(
                                ride.getId(),
                                ride.getPickupAddress(),
                                ride.getDropAddress(),
                                ride.getRideType(),
                                ride.getEstimatedFare(),
                                nearbyDriver.distanceKm(),
                                requestedAt);

                log.info(
                        "Sending rideId={} to driverId={}, principal={}",
                        ride.getId(),
                        driver.getId(),
                        recipient);

                messagingTemplate.convertAndSendToUser(
                        recipient,
                        "/queue/ride-requests",
                        notification);

                log.info(
                        "Submitted rideId={} notification for driverId={}",
                        ride.getId(),
                        driver.getId());

            } catch (RuntimeException ex) {
                log.error(
                        "Failed to send rideId={} notification to driverId={}",
                        ride.getId(),
                        nearbyDriver.driverId(),
                        ex);
            }
        }
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
                                                ? first
                                                : second));

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
        return value != null
                && Double.isFinite(value)
                && value >= -90
                && value <= 90;
    }

    private boolean validLongitude(Double value) {
        return value != null
                && Double.isFinite(value)
                && value >= -180
                && value <= 180;
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
                Math.sqrt(a),
                Math.sqrt(1 - a));

        return Math.round(earthRadiusKm * c * 100.0) / 100.0;
    }
}
