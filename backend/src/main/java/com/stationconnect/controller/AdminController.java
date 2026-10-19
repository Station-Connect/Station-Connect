package com.stationconnect.controller;

import com.stationconnect.entity.DriverProfile;
import com.stationconnect.repository.DriverProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final DriverProfileRepository driverProfileRepository;

    public AdminController(
            DriverProfileRepository driverProfileRepository) {
        this.driverProfileRepository = driverProfileRepository;
    }

    @GetMapping("/test")
    public Map<String, String> test() {
        return Map.of("message", "Admin access OK");
    }

    @GetMapping("/drivers/pending")
    public java.util.List<DriverProfile> getPendingDrivers() {
        return driverProfileRepository.findAll()
                .stream()
                .filter(profile ->
                        profile.getVerificationStatus()
                                == DriverProfile.VerificationStatus.PENDING)
                .toList();
    }

    @PatchMapping("/drivers/{driverId}/verification")
    public DriverProfile updateDriverVerification(
            @PathVariable Long driverId,
            @RequestBody Map<String, String> request) {

        String status = request.get("status");

        if (status == null
                || (!status.equalsIgnoreCase("APPROVED")
                && !status.equalsIgnoreCase("REJECTED"))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Status must be APPROVED or REJECTED");
        }

        DriverProfile profile = driverProfileRepository.findById(driverId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Driver profile not found"));

        DriverProfile.VerificationStatus verificationStatus =
                DriverProfile.VerificationStatus.valueOf(
                        status.toUpperCase(java.util.Locale.ROOT));

        profile.setVerificationStatus(verificationStatus);

        if (verificationStatus
                == DriverProfile.VerificationStatus.REJECTED) {
            profile.setOnline(false);
        }

        return driverProfileRepository.save(profile);
    }
}
