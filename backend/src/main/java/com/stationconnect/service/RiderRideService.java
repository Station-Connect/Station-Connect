
package com.stationconnect.service;

import com.stationconnect.entity.Ride;
import com.stationconnect.entity.Role;
import com.stationconnect.exception.ApiException;
import com.stationconnect.repository.RideRepository;
import com.stationconnect.repository.UserRepository;

import java.util.Locale;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RiderRideService {

    private final RideRepository rideRepository;
    private final UserRepository userRepository;

    public RiderRideService(
            RideRepository rideRepository,
            UserRepository userRepository) {
        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Ride getMyRide(String email, Long rideId) {
        String normalizedEmail = email == null
                ? ""
                : email.trim().toLowerCase(Locale.ROOT);

        var rider = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "User not found"));

        if (rider.getRole() != Role.RIDER) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Only riders can access rider rides");
        }

        return rideRepository.findByIdAndRequestedBy(
                        rideId, rider.getId())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "Ride not found for this rider"));
    }
    @Transactional
public Ride cancelMyRide(String email, Long rideId) {
    String normalizedEmail = email == null
            ? ""
            : email.trim().toLowerCase(Locale.ROOT);

    var rider = userRepository.findByEmail(normalizedEmail)
            .orElseThrow(() -> new ApiException(
                    HttpStatus.NOT_FOUND, "User not found"));

    if (rider.getRole() != Role.RIDER) {
        throw new ApiException(
                HttpStatus.FORBIDDEN,
                "Only riders can cancel rider rides");
    }

    int updated = rideRepository.cancelRideByRider(
            rideId, rider.getId());

    if (updated == 0) {
        Ride ride = rideRepository.findByIdAndRequestedBy(
                        rideId, rider.getId())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "Ride not found for this rider"));

        throw new ApiException(
                HttpStatus.CONFLICT,
                "Ride cannot be cancelled in its current status: "
                        + ride.getStatus());
    }

    return rideRepository.findByIdAndRequestedBy(
                    rideId, rider.getId())
            .orElseThrow(() -> new ApiException(
                    HttpStatus.NOT_FOUND,
                    "Ride not found for this rider"));
}
@Transactional(readOnly = true)
public List<Ride> getMyRideHistory(String email) {
    String normalizedEmail = email == null
            ? ""
            : email.trim().toLowerCase(Locale.ROOT);

    var rider = userRepository.findByEmail(normalizedEmail)
            .orElseThrow(() -> new ApiException(
                    HttpStatus.NOT_FOUND, "User not found"));

    if (rider.getRole() != Role.RIDER) {
        throw new ApiException(
                HttpStatus.FORBIDDEN,
                "Only riders can access ride history");
    }

    return rideRepository.findByRequestedByOrderByRequestedAtDesc(
            rider.getId());
} 
}
