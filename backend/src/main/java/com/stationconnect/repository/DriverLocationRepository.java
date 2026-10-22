
package com.stationconnect.repository;

import com.stationconnect.entity.DriverLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface DriverLocationRepository
        extends JpaRepository<DriverLocation, Long> {

    List<DriverLocation> findByDriverIdIn(
            Collection<Long> driverIds
    );
}
