package com.stationconnect.repository;

import com.stationconnect.entity.RiderProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RiderProfileRepository
        extends JpaRepository<RiderProfile, Long> {
}