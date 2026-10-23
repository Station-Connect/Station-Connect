
package com.stationconnect.service;

import com.stationconnect.dto.DriverTrackingResponse;
import com.stationconnect.entity.DriverLocation;
import com.stationconnect.entity.Ride;
import com.stationconnect.entity.Role;
import com.stationconnect.entity.User;
import com.stationconnect.exception.ApiException;
import com.stationconnect.repository.DriverLocationRepository;
import com.stationconnect.repository.RideRepository;
import com.stationconnect.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RideTrackingService {

    private final UserRepository userRepository;
    private final RideRepository rideRepository;
    private final DriverLocationRepository driverLocationRepository;

    public RideTrackingService(
            UserRepository userRepository,
            RideRepository rideRepository,
            DriverLocationRepository driverLocationRepository) {
        this.userRepository = userRepository;
        this.rideRepository = rideRepository;
        this.driverLocationRepository = driverLocationRepository;
    }

    @Transactional(readOnly = true)
    public DriverTrackingResponse getDriverLocation(
            String email,
            Long rideId) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "User not found"));

        if (user.getRole() != Role.RIDER) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Only riders can track rides");
        }

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "Ride not found"));

        if (!ride.getRequestedBy().equals(user.getId())) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "You are not authorized to track this ride");
        }

        if (ride.getDriverId() == null
                || "REQUESTED".equals(ride.getStatus())
                || "REJECTED".equals(ride.getStatus())
                || "CANCELLED".equals(ride.getStatus())
                || "COMPLETED".equals(ride.getStatus())) {
            return new DriverTrackingResponse(
                    ride.getId(),
                    ride.getStatus(),
                    ride.getDriverId(),
                    null,
                    null,
                    null);
        }

        DriverLocation location = driverLocationRepository
                .findById(ride.getDriverId())
                .orElse(null);

        if (location == null) {
            return new DriverTrackingResponse(
                    ride.getId(),
                    ride.getStatus(),
                    ride.getDriverId(),
                    null,
                    null,
                    null);
        }

        return new DriverTrackingResponse(
                ride.getId(),
                ride.getStatus(),
                ride.getDriverId(),
                location.getLatitude(),
                location.getLongitude(),
                location.getUpdatedAt());
    }
}
