package com.stationconnect.dto;

import com.stationconnect.entity.Role;
import jakarta.validation.constraints.*;

public record RegisterRequest(
        @NotBlank @Size(max = 100) String fullName,
        @NotBlank @Email String email,
        @Pattern(regexp = "^[0-9]{10}$", message = "must be 10 digits") String phone,
        @NotBlank @Size(min = 8, message = "must be at least 8 characters") String password,
        @NotNull Role role) {
}