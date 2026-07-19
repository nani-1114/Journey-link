package com.journeylink.backend.controller;

import com.journeylink.backend.dto.LiveTrackingResponse;
import com.journeylink.backend.dto.JourneyResponse;
import com.journeylink.backend.service.TrackingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/public/journey")
public class TrackingController {

    private final TrackingService trackingService;

    public TrackingController(TrackingService trackingService) {
        this.trackingService = trackingService;
    }

    @GetMapping("/{trackingCode}")
    public ResponseEntity<?> getJourney(
            @PathVariable String trackingCode,
            @RequestParam(required = false) String password) {
        try {
            JourneyResponse response = trackingService.getJourneyByTrackingCode(trackingCode, password);
            return ResponseEntity.ok(response);
        } catch (SecurityException ex) {
            boolean req = "Password required".equals(ex.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", ex.getMessage(),
                    "passwordRequired", true,
                    "incorrectPassword", !req
            ));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.GONE).body(Map.of("error", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/{trackingCode}/live")
    public ResponseEntity<?> getLiveTracking(
            @PathVariable String trackingCode,
            @RequestParam(required = false) String password) {
        try {
            LiveTrackingResponse response = trackingService.getLiveTrackingData(trackingCode, password);
            return ResponseEntity.ok(response);
        } catch (SecurityException ex) {
            boolean req = "Password required".equals(ex.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", ex.getMessage(),
                    "passwordRequired", true,
                    "incorrectPassword", !req
            ));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.GONE).body(Map.of("error", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
        }
    }
}
