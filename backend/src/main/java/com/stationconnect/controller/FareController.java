
package com.stationconnect.controller;

import com.stationconnect.dto.FareEstimateRequest;
import com.stationconnect.dto.FareEstimateResponse;
import com.stationconnect.service.FareService;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rider/fare")
public class FareController {

    private final FareService fareService;

    public FareController(FareService fareService) {
        this.fareService = fareService;
    }

    @PostMapping("/estimate")
    public FareEstimateResponse estimateFare(
            @RequestBody FareEstimateRequest request) {

        return fareService.estimateFare(request);
    }
}
