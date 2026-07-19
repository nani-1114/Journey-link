package com.journeylink.backend.dto;

import com.journeylink.backend.model.JourneyStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveTrackingResponse {
    private String journeyName;
    private JourneyStatus status;
    
    private Double startLat;
    private Double startLng;
    private Double destinationLat;
    private Double destinationLng;
    
    private Double currentLat;
    private Double currentLng;
    
    private Double currentSpeed;
    private Double avgSpeed;
    private Double maxSpeed;
    
    private Double totalDistance; // In kilometers
    private Double distanceRemaining; // In kilometers
    private Long etaSeconds; // Estimated time remaining in seconds
    
    private List<LocationLogResponse> history;
    private boolean speedLimitExceeded;
    private LocalDateTime expiresAt;
    private String startAddress;
    private String destinationAddress;
    private String travelMode;
}
