package com.journeylink.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private long totalJourneys;
    private long activeJourneys;
    private double totalDistanceTravelled; // in km
    private double avgSpeed; // in km/h
    private List<JourneyResponse> recentJourneys;
}
