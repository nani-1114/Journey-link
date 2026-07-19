package com.journeylink.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class JourneyRequest {
    @NotBlank(message = "Journey name is required")
    private String journeyName;

    @NotNull(message = "Start latitude is required")
    private Double startLat;

    @NotNull(message = "Start longitude is required")
    private Double startLng;

    @NotNull(message = "Destination latitude is required")
    private Double destinationLat;

    @NotNull(message = "Destination longitude is required")
    private Double destinationLng;

    private String password; // Optional password protection

    private Integer expiresInMinutes; // Optional expiry time in minutes

    private String startAddress;

    private String destinationAddress;

    private String travelMode;
}
