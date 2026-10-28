package com.stationconnect.service;

import com.stationconnect.entity.DriverLocation;
import com.stationconnect.entity.DriverProfile;
import com.stationconnect.entity.DriverRideRejection;
import com.stationconnect.entity.Ride;
import com.stationconnect.entity.Role;
import com.stationconnect.entity.User;
import com.stationconnect.exception.ApiException;
import com.stationconnect.repository.DriverLocationRepository;
import com.stationconnect.repository.DriverProfileRepository;
import com.stationconnect.repository.DriverRideRejectionRepository;
import com.stationconnect.repository.RideRepository;
import com.stationconnect.repository.UserRepository;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class DriverRideService {

    private static final double SEARCH_RADIUS_KM = 10.0;
    private static final long LOCATION_MAX_AGE_MINUTES = 5;

    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final DriverLocationRepository driverLocationRepository;
    private final DriverRideRejectionRepository rejectionRepository;

    public DriverRideService(
            RideRepository rideRepository,
            UserRepository userRepository,
            DriverProfileRepository driverProfileRepository,
            DriverLocationRepository driverLocationRepository,
            DriverRideRejectionRepository rejectionRepository) {

        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
        this.driverProfileRepository = driverProfileRepository;
        this.driverLocationRepository = driverLocationRepository;
        this.rejectionRepository = rejectionRepository;
    }

    @Transactional(readOnly = true)
    public List<Ride> getAvailableRides(String email) {
        Long driverId = getEligibleDriverId(email);

        DriverLocation location = driverLocationRepository.findById(driverId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.CONFLICT,
                        "Update your location before viewing available rides"));

        OffsetDateTime cutoff = OffsetDateTime.now()
                .minusMinutes(LOCATION_MAX_AGE_MINUTES);

        if (location.getUpdatedAt() == null
                || location.getUpdatedAt().isBefore(cutoff)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Your location is stale. Update your location to view rides");
        }

        Set<Long> rejectedRideIds = rejectionRepository
                .findByDriverId(driverId)
                .stream()
                .map(DriverRideRejection::getRideId)
                .collect(Collectors.toSet());

        return rideRepository.findByStatusOrderByRequestedAtAsc("REQUESTED")
                .stream()
                .filter(ride -> ride.getDriverId() == null)
                .filter(ride -> !rejectedRideIds.contains(ride.getId()))
                .filter(ride -> distanceKm(
                        location.getLatitude(),
                        location.getLongitude(),
                        ride.getPickupLat(),
                        ride.getPickupLng()) <= SEARCH_RADIUS_KM)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Ride> getMyRides(String email) {
        Long driverId = getDriverId(email);

        return rideRepository.findByDriverIdOrderByRequestedAtDesc(driverId);
    }

    @Transactional
    public Ride acceptRide(String email, Long rideId) {
        Long driverId = getEligibleDriverId(email);

        // A driver cannot accept a ride they previously rejected.
        if (rejectionRepository.existsByDriverIdAndRideId(driverId, rideId)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "You previously rejected this ride");
        }

        int updated = rideRepository.acceptRequestedRide(rideId, driverId);

        if (updated == 0) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Ride is no longer available for acceptance");
        }

        return rideRepository.findById(rideId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "Ride not found"));
    }

    @Transactional
    public Ride rejectRide(String email, Long rideId) {
        Long driverId = getEligibleDriverId(email);

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "Ride not found"));

        if (!"REQUESTED".equals(ride.getStatus())
                || ride.getDriverId() != null) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Only unassigned requested rides can be rejected");
        }

        if (rejectionRepository.existsByDriverIdAndRideId(driverId, rideId)) {
            // Repeated rejection is harmless; do not create duplicates.
            return ride;
        }

        try {
            rejectionRepository.saveAndFlush(
                    new DriverRideRejection(driverId, rideId));
        } catch (DataIntegrityViolationException ex) {
            // Another request from this driver may have recorded it first.
            if (!rejectionRepository.existsByDriverIdAndRideId(
                    driverId, rideId)) {
                throw ex;
            }
        }

        // Keep the ride REQUESTED and unassigned for other drivers.
        return ride;
    }

    @Transactional
    public Ride markArrived(String email, Long rideId) {
        return transition(email, rideId, "ACCEPTED", "ARRIVED");
    }

    @Transactional
    public Ride startRide(String email, Long rideId) {
        return transition(email, rideId, "ARRIVED", "STARTED");
    }

    @Transactional
    public Ride completeRide(String email, Long rideId) {
        Ride ride = transition(email, rideId, "STARTED", "COMPLETED");

        ride.setFinalFare(ride.getEstimatedFare());
        ride.setCompletedAt(OffsetDateTime.now());

        return rideRepository.save(ride);
    }

    private Ride transition(
            String email,
            Long rideId,
            String expectedStatus,
            String nextStatus) {

        Long driverId = getDriverId(email);

        Ride ride = rideRepository.findByIdAndDriverId(rideId, driverId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "Ride not found for this driver"));

        if (!expectedStatus.equals(ride.getStatus())) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Ride must be " + expectedStatus
                            + " before " + nextStatus);
        }

        ride.setStatus(nextStatus);

        return rideRepository.save(ride);
    }

    private Long getDriverId(String email) {
        User user = userRepository.findByEmail(
                        email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "User not found"));

        if (user.getRole() != Role.DRIVER) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Only drivers can manage rides");
        }

        return user.getId();
    }

    private Long getEligibleDriverId(String email) {
        Long driverId = getDriverId(email);

        DriverProfile profile = driverProfileRepository.findById(driverId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "Driver profile not found"));

        if (profile.getVerificationStatus()
                    != DriverProfile.VerificationStatus.APPROVED
                || !profile.isOnline()) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Driver must be approved and online to receive rides");
        }

        return driverId;
    }

    private double distanceKm(
            double lat1,
            double lon1,
            double lat2,
            double lon2) {

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

        return 6371.0 * c;
    }
}