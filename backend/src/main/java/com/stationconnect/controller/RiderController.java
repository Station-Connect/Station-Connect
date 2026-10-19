package com.stationconnect.controller;

import com.stationconnect.entity.RiderProfile;
import com.stationconnect.service.RiderService;

import java.security.Principal;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rider")
public class RiderController {

    private final RiderService riderService;

    public RiderController(RiderService riderService) {
        this.riderService = riderService;
    }

    @GetMapping("/profile")
    public RiderProfile getProfile(Principal principal) {
        return riderService.getProfile(principal.getName());
    }
}