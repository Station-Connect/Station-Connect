
package com.stationconnect.service;

import com.stationconnect.entity.DriverProfile;
import com.stationconnect.entity.Ride;
import com.stationconnect.entity.Role;
import com.stationconnect.entity.User;
import com.stationconnect.exception.ApiException;
import com.stationconnect.repository.DriverProfileRepository;
import com.stationconnect.repository.RideRepository;
import com.stationconnect.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class DriverRideService {

    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final DriverProfileRepository driverProfileRepository;

    public DriverRideService(
            RideRepository rideRepository,
            UserRepository userRepository,
            DriverProfileRepository driverProfileRepository) {
        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
        this.driverProfileRepository = driverProfileRepository;
    }

    public List<Ride> getAvailableRides(String email) {
        getEligibleDriverId(email);
        return rideRepository.findByStatusOrderByRequestedAtAsc("REQUESTED")
                .stream()
                .filter(ride -> ride.getDriverId() == null)
                .toList();
    }

    public List<Ride> getMyRides(String email) {
        Long driverId = getDriverId(email);
        return rideRepository.findByDriverIdOrderByRequestedAtDesc(driverId);
    }

    @Transactional
    public Ride acceptRide(String email, Long rideId) {
        Long driverId = getEligibleDriverId(email);

        int updated = rideRepository.acceptRequestedRide(rideId, driverId);
        if (updated == 0) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Ride is no longer available for acceptance");
        }

        return rideRepository.findById(rideId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "Ride not found"));
    }

    @Transactional
    public Ride rejectRide(String email, Long rideId) {
        getEligibleDriverId(email);

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "Ride not found"));

        if (!"REQUESTED".equals(ride.getStatus())
                || ride.getDriverId() != null) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Only unassigned requested rides can be rejected");
        }

        // Rejection does not change the shared ride's status or assignment.
        // It simply declines this driver's offer.
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

    // Use the estimated fare as the final fare for now.
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
                    "Ride must be " + expectedStatus + " before " + nextStatus);
        }

        ride.setStatus(nextStatus);
        return rideRepository.save(ride);
    }

    private Long getDriverId(String email) {
        User user = userRepository.findByEmail(
                        email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "User not found"));

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
}