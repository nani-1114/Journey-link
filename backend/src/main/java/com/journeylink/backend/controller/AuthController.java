package com.journeylink.backend.controller;

import com.journeylink.backend.dto.JwtAuthenticationResponse;
import com.journeylink.backend.dto.LoginRequest;
import com.journeylink.backend.dto.RegisterRequest;
import com.journeylink.backend.dto.UserResponse;
import com.journeylink.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        UserResponse response = authService.register(registerRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<JwtAuthenticationResponse> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        JwtAuthenticationResponse token = authService.login(loginRequest);
        return ResponseEntity.ok(token);
    }

    @GetMapping("/profile")
    public ResponseEntity<UserResponse> getUserProfile() {
        UserResponse profile = authService.getCurrentUserProfile();
        return ResponseEntity.ok(profile);
    }
}
