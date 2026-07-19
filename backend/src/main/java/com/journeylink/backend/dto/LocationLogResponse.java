package com.journeylink.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationLogResponse {
    private Double latitude;
    private Double longitude;
    private Double speed;
    private LocalDateTime timestamp;
}
