package com.stationconnect.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(
    name = "driver_ride_rejections",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uq_driver_ride_rejection",
            columnNames = {"driver_id", "ride_id"}
        )
    }
)
public class DriverRideRejection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "ride_id", nullable = false)
    private Long rideId;

    @Column(
        name = "rejected_at",
        nullable = false,
        insertable = false,
        updatable = false
    )
    private OffsetDateTime rejectedAt;

    protected DriverRideRejection() {
    }

    public DriverRideRejection(Long driverId, Long rideId) {
        this.driverId = driverId;
        this.rideId = rideId;
    }

    public Long getId() {
        return id;
    }

    public Long getDriverId() {
        return driverId;
    }

    public Long getRideId() {
        return rideId;
    }

    public OffsetDateTime getRejectedAt() {
        return rejectedAt;
    }
}