
package com.stationconnect.repository;

import com.stationconnect.entity.Ride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RideRepository extends JpaRepository<Ride, Long> {

    List<Ride> findByStatusOrderByRequestedAtAsc(String status);

    List<Ride> findByDriverIdOrderByRequestedAtDesc(Long driverId);

    Optional<Ride> findByIdAndDriverId(Long id, Long driverId);

    @Modifying
    @Query("""
        UPDATE Ride r
        SET r.driverId = :driverId,
            r.status = 'ACCEPTED'
        WHERE r.id = :rideId
          AND r.status = 'REQUESTED'
          AND r.driverId IS NULL
        """)
    int acceptRequestedRide(
            @Param("rideId") Long rideId,
            @Param("driverId") Long driverId);
}
