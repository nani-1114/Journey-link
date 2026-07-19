package com.journeylink.backend.service;

import com.journeylink.backend.dto.LiveTrackingResponse;
import com.journeylink.backend.dto.LocationLogResponse;
import com.journeylink.backend.dto.JourneyResponse;
import com.journeylink.backend.model.Journey;
import com.journeylink.backend.model.JourneyStatus;
import com.journeylink.backend.model.LocationLog;
import com.journeylink.backend.repository.JourneyRepository;
import com.journeylink.backend.repository.LocationLogRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
public class TrackingService {

    private final JourneyRepository journeyRepository;
    private final LocationLogRepository locationLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final JourneyService journeyService;

    public TrackingService(
            JourneyRepository journeyRepository,
            LocationLogRepository locationLogRepository,
            PasswordEncoder passwordEncoder,
            JourneyService journeyService) {
        this.journeyRepository = journeyRepository;
        this.locationLogRepository = locationLogRepository;
        this.passwordEncoder = passwordEncoder;
        this.journeyService = journeyService;
    }

    public JourneyResponse getJourneyByTrackingCode(String trackingCode, String password) {
        Journey journey = journeyRepository.findByTrackingCode(trackingCode)
                .orElseThrow(() -> new NoSuchElementException("Journey link not found"));

        validateJourney(journey, password);

        return journeyService.mapToResponse(journey);
    }

    public LiveTrackingResponse getLiveTrackingData(String trackingCode, String password) {
        Journey journey = journeyRepository.findByTrackingCode(trackingCode)
                .orElseThrow(() -> new NoSuchElementException("Journey link not found"));

        validateJourney(journey, password);

        return getLiveTrackingData(journey);
    }

    public LiveTrackingResponse getLiveTrackingData(Journey journey) {
        List<LocationLog> logs = locationLogRepository.findByJourneyOrderByTimestampAsc(journey);
        
        LocationLog currentLog = logs.isEmpty() ? null : logs.get(logs.size() - 1);
        
        Double currentLat = currentLog != null ? currentLog.getLatitude() : journey.getStartLat();
        Double currentLng = currentLog != null ? currentLog.getLongitude() : journey.getStartLng();
        Double currentSpeed = currentLog != null ? currentLog.getSpeed() : 0.0;

        double totalDistance = journeyService.calculateTotalDistance(logs);
        double distanceRemaining = journeyService.haversineDistance(
                currentLat, currentLng,
                journey.getDestinationLat(), journey.getDestinationLng()
        );

        // Stats calculation
        double maxSpeed = 0.0;
        double speedSum = 0.0;
        for (LocationLog log : logs) {
            if (log.getSpeed() > maxSpeed) {
                maxSpeed = log.getSpeed();
            }
            speedSum += log.getSpeed();
        }
        double avgSpeed = logs.isEmpty() ? 0.0 : (speedSum / logs.size());

        // ETA calculation
        long etaSeconds = -1;
        if (journey.getStatus() == JourneyStatus.ACTIVE) {
            // If current speed is 0 or extremely low, use average speed, if both are low, use fallback of 40 km/h
            double speedForEta = currentSpeed > 5.0 ? currentSpeed : (avgSpeed > 5.0 ? avgSpeed : 40.0);
            double hoursRemaining = distanceRemaining / speedForEta;
            etaSeconds = (long) (hoursRemaining * 3600);
        } else {
            etaSeconds = 0; // Journey is completed
        }

        // Speed alert limit: e.g. 100 km/h
        boolean speedLimitExceeded = currentSpeed > 100.0;

        List<LocationLogResponse> history = logs.stream()
                .map(l -> LocationLogResponse.builder()
                        .latitude(l.getLatitude())
                        .longitude(l.getLongitude())
                        .speed(l.getSpeed())
                        .timestamp(l.getTimestamp())
                        .build())
                .collect(Collectors.toList());

        return LiveTrackingResponse.builder()
                .journeyName(journey.getJourneyName())
                .status(journey.getStatus())
                .startLat(journey.getStartLat())
                .startLng(journey.getStartLng())
                .destinationLat(journey.getDestinationLat())
                .destinationLng(journey.getDestinationLng())
                .currentLat(currentLat)
                .currentLng(currentLng)
                .currentSpeed(Math.round(currentSpeed * 10.0) / 10.0)
                .avgSpeed(Math.round(avgSpeed * 10.0) / 10.0)
                .maxSpeed(Math.round(maxSpeed * 10.0) / 10.0)
                .totalDistance(Math.round(totalDistance * 100.0) / 100.0)
                .distanceRemaining(Math.round(distanceRemaining * 100.0) / 100.0)
                .etaSeconds(etaSeconds)
                .history(history)
                .speedLimitExceeded(speedLimitExceeded)
                .expiresAt(journey.getExpiresAt())
                .startAddress(journey.getStartAddress())
                .destinationAddress(journey.getDestinationAddress())
                .travelMode(journey.getTravelMode())
                .build();
    }

    private void validateJourney(Journey journey, String password) {
        // Expiry check
        if (journey.getExpiresAt() != null && journey.getExpiresAt().isBefore(LocalDateTime.now())) {
            // Auto complete if expired and still active
            if (journey.getStatus() == JourneyStatus.ACTIVE) {
                journey.setStatus(JourneyStatus.COMPLETED);
                journey.setEndTime(journey.getExpiresAt());
                journeyRepository.save(journey);
            }
            throw new IllegalStateException("This tracking link has expired");
        }

        // Password check
        if (journey.getPasswordHash() != null) {
            if (password == null || password.trim().isEmpty()) {
                throw new SecurityException("Password required");
            }
            if (!passwordEncoder.matches(password.trim(), journey.getPasswordHash())) {
                throw new SecurityException("Incorrect password");
            }
        }
    }

    public LiveTrackingResponse getJourneyAnalytics(java.util.UUID journeyId, String currentUserEmail) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Journey not found"));

        if (!journey.getUser().getEmail().equals(currentUserEmail)) {
            throw new SecurityException("You do not have permission to view this journey's analytics");
        }

        return getLiveTrackingData(journey);
    }
}
