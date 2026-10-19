
package com.stationconnect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DriverProfileRequest(

        @NotBlank(message = "Vehicle type is required")
        @Size(max = 50, message = "Vehicle type must not exceed 50 characters")
        String vehicleType,

        @NotBlank(message = "Vehicle number is required")
        @Size(max = 20, message = "Vehicle number must not exceed 20 characters")
        String vehicleNumber,

        @Size(max = 500, message = "Document URL must not exceed 500 characters")
        String documentUrl

) {}
