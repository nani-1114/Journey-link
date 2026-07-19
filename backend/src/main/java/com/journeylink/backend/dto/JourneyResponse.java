package com.journeylink.backend.dto;

import com.journeylink.backend.model.JourneyStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JourneyResponse {
    private UUID id;
    private String journeyName;
    private String trackingCode;
    private Double startLat;
    private Double startLng;
    private Double destinationLat;
    private Double destinationLng;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private JourneyStatus status;
    private boolean passwordProtected;
    private LocalDateTime expiresAt;
    private String startAddress;
    private String destinationAddress;
    private String travelMode;
}
