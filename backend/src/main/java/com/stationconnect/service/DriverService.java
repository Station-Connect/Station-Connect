
package com.stationconnect.service;

import com.stationconnect.dto.DriverLocationRequest;
import com.stationconnect.dto.DriverLocationUpdate;
import com.stationconnect.dto.DriverProfileRequest;
import com.stationconnect.entity.DriverLocation;
import com.stationconnect.entity.DriverProfile;
import com.stationconnect.entity.Role;
import com.stationconnect.exception.ApiException;
import com.stationconnect.repository.DriverLocationRepository;
import com.stationconnect.repository.DriverProfileRepository;
import com.stationconnect.repository.RideRepository;
import com.stationconnect.repository.UserRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class DriverService {

    private static final List<String> TRACKED_RIDE_STATUSES =
            List.of("ACCEPTED", "ARRIVED", "STARTED");

    private final DriverProfileRepository driverProfileRepository;
    private final UserRepository userRepository;
    private final DriverLocationRepository driverLocationRepository;
    private final RideRepository rideRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public DriverService(
            DriverProfileRepository driverProfileRepository,
            DriverLocationRepository driverLocationRepository,
            UserRepository userRepository,
            RideRepository rideRepository,
            SimpMessagingTemplate messagingTemplate) {

        this.driverProfileRepository = driverProfileRepository;
        this.driverLocationRepository = driverLocationRepository;
        this.userRepository = userRepository;
        this.rideRepository = rideRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional(readOnly = true)
    public DriverProfile getProfile(String email) {
        var user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "User not found"));

        if (user.getRole() != Role.DRIVER) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Only drivers can access this profile");
        }

        return driverProfileRepository.findById(user.getId())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "Driver profile not found"));
    }

    @Transactional
    public DriverLocation updateLocation(
            String email,
            double latitude,
            double longitude) {

        var user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "User not found"));

        if (user.getRole() != Role.DRIVER) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Only drivers can update their location");
        }

        if (!Double.isFinite(latitude)
                || latitude < -90
                || latitude > 90
                || !Double.isFinite(longitude)
                || longitude < -180
                || longitude > 180) {

            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid latitude or longitude");
        }

        if (!driverProfileRepository.existsById(user.getId())) {
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    "Driver profile not found");
        }

        OffsetDateTime updatedAt = OffsetDateTime.now();

        DriverLocation location = driverLocationRepository
                .findById(user.getId())
                .orElseGet(DriverLocation::new);

        location.setDriverId(user.getId());
        location.setLatitude(latitude);
        location.setLongitude(longitude);
        location.setUpdatedAt(updatedAt);

        DriverLocation savedLocation =
                driverLocationRepository.save(location);

        broadcastLocationAfterCommit(
                user.getId(), latitude, longitude, updatedAt);

        return savedLocation;
    }

    private void broadcastLocationAfterCommit(
            Long driverId,
            double latitude,
            double longitude,
            OffsetDateTime updatedAt) {

        Runnable broadcast = () -> {
            var activeRides =
                    rideRepository.findByDriverIdAndStatusIn(
                            driverId, TRACKED_RIDE_STATUSES);

            for (var ride : activeRides) {
                var rider = userRepository.findById(
                        ride.getRequestedBy()).orElse(null);

                if (rider == null
                        || rider.getRole() != Role.RIDER
                        || rider.getEmail() == null
                        || rider.getEmail().isBlank()) {
                    continue;
                }

                DriverLocationUpdate update =
                        new DriverLocationUpdate(
                                ride.getId(),
                                latitude,
                                longitude,
                                updatedAt);

                messagingTemplate.convertAndSendToUser(
                        normalizeEmail(rider.getEmail()),
                        "/queue/rides/" + ride.getId() + "/location",
                        update);
            }
        };

        if (TransactionSynchronizationManager
                .isSynchronizationActive()) {

            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            broadcast.run();
                        }
                    });
        } else {
            broadcast.run();
        }
    }

    @Transactional(readOnly = true)
    public DriverLocation getLocation(String email) {
        var user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "User not found"));

        if (user.getRole() != Role.DRIVER) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Only drivers can access their location");
        }

        return driverLocationRepository.findById(user.getId())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "Driver location not found"));
    }

    @Transactional
    public DriverProfile updateOnlineStatus(
            String email,
            boolean online) {

        var user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "User not found"));

        if (user.getRole() != Role.DRIVER) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Only drivers can change their online status");
        }

        DriverProfile profile = driverProfileRepository.findById(user.getId())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "Driver profile not found"));

        if (online
                && profile.getVerificationStatus()
                != DriverProfile.VerificationStatus.APPROVED) {

            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Only approved drivers can go online");
        }

        profile.setOnline(online);
        return driverProfileRepository.save(profile);
    }

    @Transactional
    public DriverProfile createProfile(
            String email,
            DriverProfileRequest request) {

        var user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "User not found"));

        if (user.getRole() != Role.DRIVER) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Only drivers can create a driver profile");
        }

        if (driverProfileRepository.existsById(user.getId())) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Driver profile already exists");
        }

        DriverProfile profile = new DriverProfile();
        profile.setUserId(user.getId());
        profile.setVehicleType(request.vehicleType().trim());
        profile.setVehicleNumber(
                request.vehicleNumber()
                        .trim()
                        .toUpperCase(Locale.ROOT));

        if (request.documentUrl() != null
                && !request.documentUrl().isBlank()) {
            profile.setDocumentUrl(request.documentUrl().trim());
        }

        profile.setVerificationStatus(
                DriverProfile.VerificationStatus.PENDING);
        profile.setOnline(false);

        return driverProfileRepository.save(profile);
    }

    private String normalizeEmail(String email) {
        return email == null
                ? ""
                : email.trim().toLowerCase(Locale.ROOT);
    }
}
