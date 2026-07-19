package com.journeylink.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "journeys", indexes = {
    @Index(name = "idx_journeys_tracking_code", columnList = "tracking_code", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Journey {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank
    @Column(name = "journey_name", nullable = false)
    private String journeyName;

    @NotBlank
    @Column(name = "tracking_code", nullable = false, unique = true)
    private String trackingCode;

    @NotNull
    @Column(name = "start_lat", nullable = false)
    private Double startLat;

    @NotNull
    @Column(name = "start_lng", nullable = false)
    private Double startLng;

    @NotNull
    @Column(name = "destination_lat", nullable = false)
    private Double destinationLat;

    @NotNull
    @Column(name = "destination_lng", nullable = false)
    private Double destinationLng;

    @CreationTimestamp
    @Column(name = "start_time", nullable = false, updatable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JourneyStatus status;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "start_address")
    private String startAddress;

    @Column(name = "destination_address")
    private String destinationAddress;

    @Column(name = "travel_mode")
    private String travelMode;
}
