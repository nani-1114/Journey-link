package com.journeylink.backend.service;

import com.journeylink.backend.dto.*;
import com.journeylink.backend.model.*;
import com.journeylink.backend.repository.JourneyRepository;
import com.journeylink.backend.repository.LocationLogRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class JourneyService {

    private final JourneyRepository journeyRepository;
    private final LocationLogRepository locationLogRepository;
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;

    public JourneyService(
            JourneyRepository journeyRepository,
            LocationLogRepository locationLogRepository,
            AuthService authService,
            PasswordEncoder passwordEncoder) {
        this.journeyRepository = journeyRepository;
        this.locationLogRepository = locationLogRepository;
        this.authService = authService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public JourneyResponse createJourney(JourneyRequest request) {
        User currentUser = authService.getCurrentUserEntity();

        // Check if there is already an active journey, optional but good UX. We allow multiple, but typically users have one.
        String trackingCode = UUID.randomUUID().toString().replace("-", "").substring(0, 12);

        String passwordHash = null;
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            passwordHash = passwordEncoder.encode(request.getPassword().trim());
        }

        LocalDateTime expiresAt = null;
        if (request.getExpiresInMinutes() != null && request.getExpiresInMinutes() > 0) {
            expiresAt = LocalDateTime.now().plusMinutes(request.getExpiresInMinutes());
        }

        Journey journey = Journey.builder()
                .user(currentUser)
                .journeyName(request.getJourneyName())
                .trackingCode(trackingCode)
                .startLat(request.getStartLat())
                .startLng(request.getStartLng())
                .destinationLat(request.getDestinationLat())
                .destinationLng(request.getDestinationLng())
                .status(JourneyStatus.ACTIVE)
                .passwordHash(passwordHash)
                .expiresAt(expiresAt)
                .startAddress(request.getStartAddress())
                .destinationAddress(request.getDestinationAddress())
                .travelMode(request.getTravelMode() != null ? request.getTravelMode() : "DRIVING")
                .build();

        Journey savedJourney = journeyRepository.save(journey);

        return mapToResponse(savedJourney);
    }

    @Transactional
    public JourneyResponse endJourney(UUID journeyId) {
        User currentUser = authService.getCurrentUserEntity();
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new NoSuchElementException("Journey not found"));

        if (!journey.getUser().getId().equals(currentUser.getId())) {
            throw new SecurityException("You do not have permission to modify this journey");
        }

        if (journey.getStatus() == JourneyStatus.ACTIVE) {
            journey.setStatus(JourneyStatus.COMPLETED);
            journey.setEndTime(LocalDateTime.now());
            journey = journeyRepository.save(journey);
        }

        return mapToResponse(journey);
    }

    public JourneyResponse getJourneyById(UUID journeyId) {
        User currentUser = authService.getCurrentUserEntity();
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new NoSuchElementException("Journey not found"));

        if (!journey.getUser().getId().equals(currentUser.getId())) {
            throw new SecurityException("You do not have permission to view this journey");
        }

        return mapToResponse(journey);
    }

    public List<JourneyResponse> getJourneyHistory() {
        User currentUser = authService.getCurrentUserEntity();
        List<Journey> journeys = journeyRepository.findByUserOrderByStartTimeDesc(currentUser);
        return journeys.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public DashboardResponse getDashboardStats() {
        User currentUser = authService.getCurrentUserEntity();

        long totalJourneys = journeyRepository.countByUser(currentUser);
        long activeJourneys = journeyRepository.countByUserAndStatus(currentUser, JourneyStatus.ACTIVE);

        List<Journey> allJourneys = journeyRepository.findByUserOrderByStartTimeDesc(currentUser);
        List<JourneyResponse> recentJourneys = allJourneys.stream()
                .limit(5)
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        // Calculate statistics
        double totalDistance = 0.0;
        double speedSum = 0.0;
        long totalLogsCount = 0;

        for (Journey journey : allJourneys) {
            List<LocationLog> logs = locationLogRepository.findByJourneyOrderByTimestampAsc(journey);
            totalDistance += calculateTotalDistance(logs);
            for (LocationLog log : logs) {
                speedSum += log.getSpeed();
                totalLogsCount++;
            }
        }

        double avgSpeed = totalLogsCount > 0 ? (speedSum / totalLogsCount) : 0.0;

        return DashboardResponse.builder()
                .totalJourneys(totalJourneys)
                .activeJourneys(activeJourneys)
                .totalDistanceTravelled(Math.round(totalDistance * 100.0) / 100.0)
                .avgSpeed(Math.round(avgSpeed * 100.0) / 100.0)
                .recentJourneys(recentJourneys)
                .build();
    }

    public double calculateTotalDistance(List<LocationLog> logs) {
        if (logs == null || logs.size() < 2) {
            return 0.0;
        }
        double distance = 0.0;
        for (int i = 0; i < logs.size() - 1; i++) {
            LocationLog current = logs.get(i);
            LocationLog next = logs.get(i + 1);
            distance += haversineDistance(
                    current.getLatitude(), current.getLongitude(),
                    next.getLatitude(), next.getLongitude()
            );
        }
        return distance;
    }

    public double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth radius in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    public JourneyResponse mapToResponse(Journey journey) {
        return JourneyResponse.builder()
                .id(journey.getId())
                .journeyName(journey.getJourneyName())
                .trackingCode(journey.getTrackingCode())
                .startLat(journey.getStartLat())
                .startLng(journey.getStartLng())
                .destinationLat(journey.getDestinationLat())
                .destinationLng(journey.getDestinationLng())
                .startTime(journey.getStartTime())
                .endTime(journey.getEndTime())
                .status(journey.getStatus())
                .passwordProtected(journey.getPasswordHash() != null)
                .expiresAt(journey.getExpiresAt())
                .startAddress(journey.getStartAddress())
                .destinationAddress(journey.getDestinationAddress())
                .travelMode(journey.getTravelMode())
                .build();
    }
}
