package com.journeylink.backend.controller;

import com.journeylink.backend.dto.DashboardResponse;
import com.journeylink.backend.dto.JourneyRequest;
import com.journeylink.backend.dto.JourneyResponse;
import com.journeylink.backend.dto.LiveTrackingResponse;
import com.journeylink.backend.service.JourneyService;
import com.journeylink.backend.service.TrackingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/journeys")
public class JourneyController {

    private final JourneyService journeyService;
    private final TrackingService trackingService;

    public JourneyController(JourneyService journeyService, TrackingService trackingService) {
        this.journeyService = journeyService;
        this.trackingService = trackingService;
    }

    @PostMapping
    public ResponseEntity<JourneyResponse> createJourney(@Valid @RequestBody JourneyRequest request) {
        JourneyResponse response = journeyService.createJourney(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/end")
    public ResponseEntity<JourneyResponse> endJourney(@PathVariable UUID id) {
        JourneyResponse response = journeyService.endJourney(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<JourneyResponse> getJourneyById(@PathVariable UUID id) {
        JourneyResponse response = journeyService.getJourneyById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history")
    public ResponseEntity<List<JourneyResponse>> getJourneyHistory() {
        List<JourneyResponse> history = journeyService.getJourneyHistory();
        return ResponseEntity.ok(history);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponse> getDashboardStats() {
        DashboardResponse stats = journeyService.getDashboardStats();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/{id}/analytics")
    public ResponseEntity<LiveTrackingResponse> getJourneyAnalytics(
            @PathVariable UUID id,
            org.springframework.security.core.Authentication authentication) {
        LiveTrackingResponse response = trackingService.getJourneyAnalytics(id, authentication.getName());
        return ResponseEntity.ok(response);
    }
}
