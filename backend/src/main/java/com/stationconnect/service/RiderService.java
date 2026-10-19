package com.stationconnect.service;

import com.stationconnect.dto.RiderProfileUpdateRequest;
import com.stationconnect.entity.RiderProfile;
import com.stationconnect.entity.User;
import com.stationconnect.entity.Role;
import com.stationconnect.exception.ApiException;
import com.stationconnect.repository.RiderProfileRepository;
import com.stationconnect.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class RiderService {

    private final RiderProfileRepository riderProfileRepository;
    private final UserRepository userRepository;

    public RiderService(
            RiderProfileRepository riderProfileRepository,
            UserRepository userRepository) {

        this.riderProfileRepository = riderProfileRepository;
        this.userRepository = userRepository;
    }

    public RiderProfile getProfile(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        if (user.getRole() != Role.RIDER) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Only riders can access rider profiles"
            );
        }

        return riderProfileRepository.findById(user.getId())
                .orElseGet(() -> {
                    RiderProfile profile = new RiderProfile();
                    profile.setUserId(user.getId());
                    return riderProfileRepository.save(profile);
                });
    }

    public RiderProfile updateProfile(
            String email,
            RiderProfileUpdateRequest request) {

        RiderProfile profile = getProfile(email);

        if (request.defaultPickupLocation() != null) {
            profile.setDefaultPickupLocation(
                    request.defaultPickupLocation()
            );
        }

        if (request.preferredPaymentMethod() != null) {
            profile.setPreferredPaymentMethod(
                    request.preferredPaymentMethod()
            );
        }

        return riderProfileRepository.save(profile);
    }
}