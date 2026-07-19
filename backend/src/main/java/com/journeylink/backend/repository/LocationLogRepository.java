package com.journeylink.backend.repository;

import com.journeylink.backend.model.Journey;
import com.journeylink.backend.model.LocationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LocationLogRepository extends JpaRepository<LocationLog, UUID> {
    List<LocationLog> findByJourneyOrderByTimestampAsc(Journey journey);
    List<LocationLog> findByJourneyOrderByTimestampDesc(Journey journey);
}
