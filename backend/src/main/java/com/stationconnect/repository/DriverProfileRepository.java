
package com.stationconnect.repository;

import com.stationconnect.entity.DriverProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DriverProfileRepository
        extends JpaRepository<DriverProfile, Long> {

    List<DriverProfile> findByVerificationStatusAndOnlineTrue(
            DriverProfile.VerificationStatus verificationStatus
    );
}
