
package com.stationconnect.controller;

import com.stationconnect.entity.Ride;
import com.stationconnect.service.DriverRideService;

import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/driver/rides")
public class DriverRideController {

    private final DriverRideService driverRideService;

    public DriverRideController(DriverRideService driverRideService) {
        this.driverRideService = driverRideService;
    }

    @GetMapping("/available")
    public List<Ride> getAvailableRides(Principal principal) {
        return driverRideService.getAvailableRides(principal.getName());
    }

    @GetMapping("/active")
    public List<Ride> getMyRides(Principal principal) {
        return driverRideService.getMyRides(principal.getName())
                .stream()
                .filter(ride -> !"COMPLETED".equals(ride.getStatus()))
                .toList();
    }

    @PatchMapping("/{rideId}/accept")
    public Ride acceptRide(
            Principal principal,
            @PathVariable Long rideId) {
        return driverRideService.acceptRide(principal.getName(), rideId);
    }

    @PatchMapping("/{rideId}/reject")
    public Ride rejectRide(
            Principal principal,
            @PathVariable Long rideId) {
        return driverRideService.rejectRide(principal.getName(), rideId);
    }

    @PatchMapping("/{rideId}/arrived")
    public Ride markArrived(
            Principal principal,
            @PathVariable Long rideId) {
        return driverRideService.markArrived(principal.getName(), rideId);
    }

    @PatchMapping("/{rideId}/start")
    public Ride startRide(
            Principal principal,
            @PathVariable Long rideId) {
        return driverRideService.startRide(principal.getName(), rideId);
    }

    @PatchMapping("/{rideId}/complete")
    public Ride completeRide(
            Principal principal,
            @PathVariable Long rideId) {
        return driverRideService.completeRide(principal.getName(), rideId);
    }
}
