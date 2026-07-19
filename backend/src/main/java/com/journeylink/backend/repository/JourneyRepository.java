package com.journeylink.backend.repository;

import com.journeylink.backend.model.Journey;
import com.journeylink.backend.model.JourneyStatus;
import com.journeylink.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JourneyRepository extends JpaRepository<Journey, UUID> {
    Optional<Journey> findByTrackingCode(String trackingCode);
    List<Journey> findByUserOrderByStartTimeDesc(User user);
    List<Journey> findByUserAndStatusOrderByStartTimeDesc(User user, JourneyStatus status);
    
    @Query("SELECT COUNT(j) FROM Journey j WHERE j.user = :user")
    long countByUser(@Param("user") User user);

    @Query("SELECT COUNT(j) FROM Journey j WHERE j.user = :user AND j.status = :status")
    long countByUserAndStatus(@Param("user") User user, @Param("status") JourneyStatus status);
}
