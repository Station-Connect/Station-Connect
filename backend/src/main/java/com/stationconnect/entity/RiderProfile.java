package com.stationconnect.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "rider_profiles")
public class RiderProfile {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "default_pickup_location")
    private String defaultPickupLocation;

    @Column(name = "preferred_payment_method")
    private String preferredPaymentMethod;

    public RiderProfile() {
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getDefaultPickupLocation() {
        return defaultPickupLocation;
    }

    public void setDefaultPickupLocation(String defaultPickupLocation) {
        this.defaultPickupLocation = defaultPickupLocation;
    }

    public String getPreferredPaymentMethod() {
        return preferredPaymentMethod;
    }

    public void setPreferredPaymentMethod(String preferredPaymentMethod) {
        this.preferredPaymentMethod = preferredPaymentMethod;
    }
}