
package com.stationconnect.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(

    @NotBlank(message = "Full name is required")
    @Size(max = 100)
    String fullName,

    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    @Size(max = 254)
    String email,

    @Size(max = 20)
    String phone,

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 72)
    String password

) {}
