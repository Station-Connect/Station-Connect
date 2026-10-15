
package com.stationconnect.controller;

import com.stationconnect.entity.DriverProfile;
import com.stationconnect.service.DriverService;
import java.security.Principal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.stationconnect.dto.DriverLocationRequest;
import com.stationconnect.entity.DriverLocation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import com.stationconnect.dto.DriverStatusRequest;
import org.springframework.web.bind.annotation.PatchMapping;

@RestController
@RequestMapping("/api/driver")
public class DriverController {

    private final DriverService driverService;

    public DriverController(DriverService driverService) {
        this.driverService = driverService;
    }

    @GetMapping("/profile")
    public DriverProfile getProfile(Principal principal) {
        return driverService.getProfile(principal.getName());
    }
    
@PutMapping("/location")
@ResponseStatus(HttpStatus.OK)
public DriverLocation updateLocation(
        Principal principal,
        @Valid @RequestBody DriverLocationRequest request) {
    return driverService.updateLocation(
            principal.getName(),
            request.latitude(),
            request.longitude());
}

@GetMapping("/location")
public DriverLocation getLocation(Principal principal) {
    return driverService.getLocation(principal.getName());
}

@PatchMapping("/status")
public DriverProfile updateStatus(
        Principal principal,
        @Valid @RequestBody DriverStatusRequest request) {
    return driverService.updateOnlineStatus(
            principal.getName(), request.online());
}


}
