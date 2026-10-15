
package com.stationconnect.dto;

import jakarta.validation.constraints.NotNull;

public record DriverStatusRequest(
        @NotNull Boolean online
) {}
