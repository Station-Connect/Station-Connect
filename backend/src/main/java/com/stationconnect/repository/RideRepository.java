
package com.stationconnect.repository;

import com.stationconnect.entity.Ride;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RideRepository extends JpaRepository<Ride, Long> {

    List<Ride> findByStatusOrderByRequestedAtAsc(String status);

    List<Ride> findByDriverIdOrderByRequestedAtDesc(Long driverId);

    Optional<Ride> findByIdAndDriverId(Long id, Long driverId);

    List<Ride> findByRequestedByOrderByRequestedAtDesc(Long requestedBy);

    /**
     * Finds rides assigned to a driver that have one of the supplied statuses.
     * Used to broadcast driver location updates only for active rides.
     */
    List<Ride> findByDriverIdAndStatusIn(
            Long driverId,
            Collection<String> statuses);

    /**
     * Finds a ride only when it belongs to the specified rider.
     * Used to prevent riders from accessing other riders' rides.
     */
    Optional<Ride> findByIdAndRequestedBy(
            Long id,
            Long requestedBy);

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

            @Modifying
    @Query("""
        UPDATE Ride r
        SET r.status = 'CANCELLED'
        WHERE r.id = :rideId
        AND r.requestedBy = :riderId
        AND r.status IN ('REQUESTED', 'ACCEPTED', 'ARRIVED')
        """)
    int cancelRideByRider(
        @Param("rideId") Long rideId,
        @Param("riderId") Long riderId);
}
