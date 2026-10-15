
package com.stationconnect.repository;

import com.stationconnect.entity.DriverProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DriverProfileRepository
        extends JpaRepository<DriverProfile, Long> {
}
