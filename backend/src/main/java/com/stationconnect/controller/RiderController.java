
package com.stationconnect.controller;

import com.stationconnect.dto.RideRequest;
import com.stationconnect.dto.RideRequestResponse;
import com.stationconnect.dto.RiderProfileUpdateRequest;
import com.stationconnect.entity.RiderProfile;
import com.stationconnect.service.RiderService;
import com.stationconnect.service.RideRequestService;

import jakarta.validation.Valid;
import java.security.Principal;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rider")
public class RiderController {

    private final RiderService riderService;
    private final RideRequestService rideRequestService;

    public RiderController(
            RiderService riderService,
            RideRequestService rideRequestService) {
        this.riderService = riderService;
        this.rideRequestService = rideRequestService;
    }

    @GetMapping("/profile")
    public RiderProfile getProfile(Principal principal) {
        return riderService.getProfile(principal.getName());
    }

    @PutMapping("/profile")
    public RiderProfile updateProfile(
            Principal principal,
            @RequestBody RiderProfileUpdateRequest request) {
        return riderService.updateProfile(
                principal.getName(), request);
    }

    @PostMapping("/rides")
    @ResponseStatus(HttpStatus.CREATED)
    public RideRequestResponse requestRide(
            Principal principal,
            @Valid @RequestBody RideRequest request) {
        return rideRequestService.requestRide(
                principal.getName(), request);
    }
}
