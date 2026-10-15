
package com.stationconnect.repository;

import com.stationconnect.entity.DriverLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DriverLocationRepository
        extends JpaRepository<DriverLocation, Long> {
}
