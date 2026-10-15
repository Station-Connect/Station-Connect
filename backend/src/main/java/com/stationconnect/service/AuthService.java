package com.stationconnect.service;

import com.stationconnect.dto.*;
import com.stationconnect.entity.Role;
import com.stationconnect.entity.User;
import com.stationconnect.exception.ApiException;
import com.stationconnect.repository.UserRepository;
import com.stationconnect.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    
public UserResponse register(RegisterRequest req) {

    String email = req.email().trim().toLowerCase(
            java.util.Locale.ROOT
    );

    if (req.password().getBytes(
            java.nio.charset.StandardCharsets.UTF_8
    ).length > 72) {
        throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "Password must not exceed 72 UTF-8 bytes"
        );
    }

    if (userRepository.existsByEmail(email)) {
        throw new ApiException(
                HttpStatus.CONFLICT,
                "Email already registered"
        );
    }

    String phone = req.phone();

    if (phone != null) {
        phone = phone.trim();

        if (phone.isEmpty()) {
            phone = null;
        } else if (userRepository.existsByPhone(phone)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Phone number already registered"
            );
        }
    }

    User user = new User();
    user.setFullName(req.fullName().trim());
    user.setEmail(email);
    user.setPhone(phone);
    user.setPasswordHash(
            passwordEncoder.encode(req.password())
    );

    // Public registrations always create RIDER accounts.
    user.setRole(Role.RIDER);

    User saved = userRepository.save(user);

    return new UserResponse(
            saved.getId(),
            saved.getFullName(),
            saved.getEmail(),
            saved.getPhone(),
            saved.getRole()
    );
}


public LoginResponse login(LoginRequest req) {

    String email = req.email()
            .trim()
            .toLowerCase(java.util.Locale.ROOT);

    User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password"
            ));

    if (!passwordEncoder.matches(
            req.password(),
            user.getPasswordHash())) {

        throw new ApiException(
                HttpStatus.UNAUTHORIZED,
                "Invalid email or password"
        );
    }

    String token = jwtUtil.generateToken(
            user.getId(),
            user.getEmail(),
            user.getRole()
    );

    return new LoginResponse(
            token,
            user.getRole(),
            user.getFullName()
    );
}


}