package com.journeylink.backend.controller;

import com.journeylink.backend.dto.LiveTrackingResponse;
import com.journeylink.backend.dto.LocationUpdateRequest;
import com.journeylink.backend.model.Journey;
import com.journeylink.backend.model.JourneyStatus;
import com.journeylink.backend.model.LocationLog;
import com.journeylink.backend.repository.JourneyRepository;
import com.journeylink.backend.repository.LocationLogRepository;
import com.journeylink.backend.service.TrackingService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.NoSuchElementException;

@Controller
public class WebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final JourneyRepository journeyRepository;
    private final LocationLogRepository locationLogRepository;
    private final TrackingService trackingService;

    public WebSocketController(
            SimpMessagingTemplate messagingTemplate,
            JourneyRepository journeyRepository,
            LocationLogRepository locationLogRepository,
            TrackingService trackingService) {
        this.messagingTemplate = messagingTemplate;
        this.journeyRepository = journeyRepository;
        this.locationLogRepository = locationLogRepository;
        this.trackingService = trackingService;
    }

    @MessageMapping("/journey/{trackingCode}/location")
    @Transactional
    public void handleLocationUpdate(
            @DestinationVariable String trackingCode,
            @Payload LocationUpdateRequest request) {
        
        Journey journey = journeyRepository.findByTrackingCode(trackingCode)
                .orElseThrow(() -> new NoSuchElementException("Journey not found"));

        if (journey.getStatus() != JourneyStatus.ACTIVE) {
            return; // Only update location for active journeys
        }

        // Validate expiry
        if (journey.getExpiresAt() != null && journey.getExpiresAt().isBefore(LocalDateTime.now())) {
            journey.setStatus(JourneyStatus.COMPLETED);
            journey.setEndTime(journey.getExpiresAt());
            journeyRepository.save(journey);
            
            // Broadcast completed status
            LiveTrackingResponse finishedData = trackingService.getLiveTrackingData(journey);
            messagingTemplate.convertAndSend("/journey/live/" + trackingCode, finishedData);
            return;
        }

        // Save location log
        LocationLog log = LocationLog.builder()
                .journey(journey)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .speed(request.getSpeed())
                .build();
        locationLogRepository.save(log);

        // Fetch live stats and broadcast
        LiveTrackingResponse liveData = trackingService.getLiveTrackingData(journey);
        messagingTemplate.convertAndSend("/journey/live/" + trackingCode, liveData);
    }
}
