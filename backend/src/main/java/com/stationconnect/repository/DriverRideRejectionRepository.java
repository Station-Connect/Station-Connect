package com.stationconnect.repository;

import com.stationconnect.entity.DriverRideRejection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DriverRideRejectionRepository
        extends JpaRepository<DriverRideRejection, Long> {

    boolean existsByDriverIdAndRideId(Long driverId, Long rideId);

    List<DriverRideRejection> findByDriverId(Long driverId);
}