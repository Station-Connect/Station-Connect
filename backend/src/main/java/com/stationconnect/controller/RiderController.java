
package com.stationconnect.controller;

import com.stationconnect.dto.DriverTrackingResponse;
import com.stationconnect.dto.RideRequest;
import com.stationconnect.dto.RideRequestResponse;
import com.stationconnect.dto.RiderProfileUpdateRequest;
import com.stationconnect.entity.Ride;
import com.stationconnect.entity.RiderProfile;
import com.stationconnect.service.RiderRideService;
import com.stationconnect.service.RiderService;
import com.stationconnect.service.RideRequestService;
import com.stationconnect.service.RideTrackingService;

import jakarta.validation.Valid;
import java.security.Principal;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rider")
public class RiderController {

    private final RiderService riderService;
    private final RideRequestService rideRequestService;
    private final RideTrackingService rideTrackingService;
    private final RiderRideService riderRideService;

    public RiderController(
            RiderService riderService,
            RideRequestService rideRequestService,
            RideTrackingService rideTrackingService,
            RiderRideService riderRideService) {
        this.riderService = riderService;
        this.rideRequestService = rideRequestService;
        this.rideTrackingService = rideTrackingService;
        this.riderRideService = riderRideService;
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

    @GetMapping("/rides/{rideId}/driver-location")
    public DriverTrackingResponse getDriverLocation(
            Principal principal,
            @PathVariable Long rideId) {
        return rideTrackingService.getDriverLocation(
                principal.getName(), rideId);
    }

    @GetMapping("/rides/{rideId}")
    public Ride getMyRide(
            Principal principal,
            @PathVariable Long rideId) {
        return riderRideService.getMyRide(
                principal.getName(), rideId);
    }
    @PatchMapping("/rides/{rideId}/cancel")
    public Ride cancelMyRide(
            Principal principal,
            @PathVariable Long rideId) {
        return riderRideService.cancelMyRide(
                principal.getName(), rideId);
}
@GetMapping("/rides")
public java.util.List<Ride> getMyRideHistory(Principal principal) {
    return riderRideService.getMyRideHistory(principal.getName());
}
}
