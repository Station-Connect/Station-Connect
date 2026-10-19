
package com.stationconnect.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.stationconnect.dto.FareEstimateRequest;
import com.stationconnect.dto.FareEstimateResponse;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class FareService {

    private static final double BASE_FARE = 30.0;
    private static final double PER_KM_RATE = 12.0;
    private static final double PER_MINUTE_RATE = 1.0;

    private static final String OSRM_BASE_URL =
            "https://router.project-osrm.org";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public FareService(ObjectMapper objectMapper) {

        this.restClient = RestClient.builder()
                .baseUrl(OSRM_BASE_URL)
                .defaultHeader("Accept", "application/json")
                .defaultHeader("Accept-Encoding", "identity")
                .build();

        this.objectMapper = objectMapper;
    }

    public FareEstimateResponse estimateFare(
            FareEstimateRequest request) {

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Fare request cannot be empty"
            );
        }

        validateCoordinates(request);

        String url = String.format(
                Locale.US,
                "/route/v1/driving/%f,%f;%f,%f?overview=false",
                request.pickupLongitude(),
                request.pickupLatitude(),
                request.dropLongitude(),
                request.dropLatitude()
        );

        try {

            String response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);

            if (response == null || response.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Empty response received from OSRM"
                );
            }

            JsonNode root = objectMapper.readTree(response);

            if (!"Ok".equals(root.path("code").asText())
                    || !root.path("routes").isArray()
                    || root.path("routes").isEmpty()) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "No driving route found"
                );
            }

            JsonNode route = root.path("routes").get(0);

            double distanceKm =
                    route.path("distance").asDouble() / 1000.0;

            double durationMinutes =
                    route.path("duration").asDouble() / 60.0;

            if (!Double.isFinite(distanceKm)
                    || !Double.isFinite(durationMinutes)
                    || distanceKm < 0
                    || durationMinutes < 0) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Invalid route data received from OSRM"
                );
            }

            double distanceFare =
                    distanceKm * PER_KM_RATE;

            double timeFare =
                    durationMinutes * PER_MINUTE_RATE;

            double totalFare =
                    BASE_FARE + distanceFare + timeFare;

            return new FareEstimateResponse(
                    round(distanceKm),
                    round(durationMinutes),
                    round(BASE_FARE),
                    round(distanceFare),
                    round(timeFare),
                    round(totalFare)
            );

        } catch (ResponseStatusException e) {
            throw e;

       } catch (RestClientException | tools.jackson.core.JacksonException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Unable to connect to OSRM",
                    e
            );
        }
    }

    private void validateCoordinates(
            FareEstimateRequest request) {

        if (!validLatitude(request.pickupLatitude())
                || !validLatitude(request.dropLatitude())
                || !validLongitude(request.pickupLongitude())
                || !validLongitude(request.dropLongitude())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid pickup or drop coordinates"
            );
        }
    }

    private boolean validLatitude(double value) {
        return Double.isFinite(value)
                && value >= -90
                && value <= 90;
    }

    private boolean validLongitude(double value) {
        return Double.isFinite(value)
                && value >= -180
                && value <= 180;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
