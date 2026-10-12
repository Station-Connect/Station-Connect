package com.stationconnect.dto;

import com.stationconnect.entity.Role;

public record LoginResponse(String token, Role role, String name) {
}