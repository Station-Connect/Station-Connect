
package com.stationconnect.service;

import com.stationconnect.entity.DriverProfile;
import com.stationconnect.repository.DriverProfileRepository;
import com.stationconnect.repository.UserRepository;
import com.stationconnect.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.stationconnect.entity.DriverLocation;
import com.stationconnect.repository.DriverLocationRepository;
import java.time.OffsetDateTime;
import com.stationconnect.dto.DriverProfileRequest;
import com.stationconnect.entity.Role;

@Service
public class DriverService {

    private final DriverProfileRepository driverProfileRepository;
    private final UserRepository userRepository;
    private final DriverLocationRepository driverLocationRepository;

    public DriverService(
            DriverProfileRepository driverProfileRepository,
            DriverLocationRepository driverLocationRepository,
            UserRepository userRepository) {
        this.driverProfileRepository = driverProfileRepository;
        this.driverLocationRepository = driverLocationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public DriverProfile getProfile(String email) {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "User not found"));

        if (user.getRole() == null
                || !user.getRole().name().equals("DRIVER")) {
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
        String email, double latitude, double longitude) {

    var user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ApiException(
                    HttpStatus.NOT_FOUND, "User not found"));

    if (user.getRole() == null
            || !user.getRole().name().equals("DRIVER")) {
        throw new ApiException(
                HttpStatus.FORBIDDEN,
                "Only drivers can update their location");
    }

    if (!Double.isFinite(latitude) || latitude < -90 || latitude > 90
            || !Double.isFinite(longitude)
            || longitude < -180 || longitude > 180) {
        throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "Invalid latitude or longitude");
    }

    if (!driverProfileRepository.existsById(user.getId())) {
        throw new ApiException(
                HttpStatus.NOT_FOUND, "Driver profile not found");
    }

    DriverLocation location = driverLocationRepository
            .findById(user.getId())
            .orElseGet(DriverLocation::new);

    location.setDriverId(user.getId());
    location.setLatitude(latitude);
    location.setLongitude(longitude);
    location.setUpdatedAt(OffsetDateTime.now());

    return driverLocationRepository.save(location);
}

@Transactional(readOnly = true)
public DriverLocation getLocation(String email) {
    var user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ApiException(
                    HttpStatus.NOT_FOUND, "User not found"));

    if (user.getRole() == null
            || !user.getRole().name().equals("DRIVER")) {
        throw new ApiException(
                HttpStatus.FORBIDDEN,
                "Only drivers can access their location");
    }

    return driverLocationRepository.findById(user.getId())
            .orElseThrow(() -> new ApiException(
                    HttpStatus.NOT_FOUND, "Driver location not found"));
}

@Transactional
public DriverProfile updateOnlineStatus(String email, boolean online) {
    var user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ApiException(
                    HttpStatus.NOT_FOUND, "User not found"));

    if (user.getRole() == null
            || !user.getRole().name().equals("DRIVER")) {
        throw new ApiException(
                HttpStatus.FORBIDDEN,
                "Only drivers can change their online status");
    }

    DriverProfile profile = driverProfileRepository.findById(user.getId())
            .orElseThrow(() -> new ApiException(
                    HttpStatus.NOT_FOUND, "Driver profile not found"));

    if (online && profile.getVerificationStatus()
            != DriverProfile.VerificationStatus.APPROVED) {
        throw new ApiException(
                HttpStatus.FORBIDDEN,
                "Only approved drivers can go online");
    }

    profile.setOnline(online);
    return driverProfileRepository.save(profile);
}

@Transactional
public DriverProfile createProfile(String email, DriverProfileRequest request) {
    var user = userRepository.findByEmail(
            email.trim().toLowerCase(java.util.Locale.ROOT))
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
            request.vehicleNumber().trim().toUpperCase(java.util.Locale.ROOT));

    if (request.documentUrl() != null
            && !request.documentUrl().isBlank()) {
        profile.setDocumentUrl(request.documentUrl().trim());
    }

    profile.setVerificationStatus(
            DriverProfile.VerificationStatus.PENDING);
    profile.setOnline(false);

    return driverProfileRepository.save(profile);
}


}
