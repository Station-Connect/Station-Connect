package com.stationconnect.dto;

import com.stationconnect.entity.Role;

public record UserResponse(Long id, String fullName, String email, String phone, Role role) {
}