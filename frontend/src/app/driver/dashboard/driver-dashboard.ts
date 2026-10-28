import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import {
  DriverRideNotificationService,
  RideRequestNotification,
} from '../driver-ride-notification.service';
import { effect } from '@angular/core';

interface DriverProfile {
  userId: number;
  vehicleType: string;
  vehicleNumber: string;
  documentUrl: string | null;
  verificationStatus: string;
  online: boolean;
  averageRating: number | null;
}

interface Ride {
  id: number;
  requestedBy: number;
  driverId: number | null;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropAddress: string;
  dropLat: number;
  dropLng: number;
  rideType: string;
  status: string;
  estimatedFare: number;
  finalFare: number | null;
  requestedAt: string;
  completedAt: string | null;
}

interface DriverLocationResponse {
  driverId: number;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

@Component({
  selector: 'app-driver-dashboard',
  imports:[DatePipe],
  standalone: true,
  template: `
    <main class="dashboard">
      <h1>Driver Dashboard</h1>

      @if (loading()) {
        <p>Loading driver profile...</p>
      } @else if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      } @else if (profile(); as p) {
        <section class="profile">
          <h2>Vehicle Details</h2>
          <p><strong>Vehicle type:</strong> {{ p.vehicleType }}</p>
          <p><strong>Vehicle number:</strong> {{ p.vehicleNumber }}</p>
          <p><strong>Verification:</strong> {{ p.verificationStatus }}</p>
          <p>
            <strong>Average rating:</strong>
            {{ p.averageRating ?? 'Not rated yet' }}
          </p>

          <hr />

          <h2>Availability</h2>
          <p>
            Current status:
            <strong>{{ p.online ? 'Online' : 'Offline' }}</strong>
          </p>

          <button
            type="button"
            [disabled]="updating() || !canGoOnline(p)"
            (click)="toggleStatus(p)"
          >
            @if (updating()) {
              Updating...
            } @else if (p.online) {
              Go Offline
            } @else {
              Go Online
            }
          </button>

          @if (!canGoOnline(p) && !p.online) {
            <p class="notice">
              Your profile must be approved before you can go online.
            </p>
          }

          @if (statusMessage()) {
            <p class="success" role="status">{{ statusMessage() }}</p>
          }

          @if (statusError()) {
            <p class="error" role="alert">{{ statusError() }}</p>
          }
          

          <hr />

          <h2>Driver Location</h2>
          <p>
            Share your current location so the system can find nearby ride
            requests.
          </p>

          <button
            type="button"
            [disabled]="locationUpdating()"
            (click)="shareCurrentLocation()"
          >
            {{ locationUpdating() ? 'Getting location...' : 'Share Current Location' }}
          </button>

          @if (locationMessage()) {
            <p class="success" role="status">{{ locationMessage() }}</p>
          }

          @if (locationError()) {
            <p class="error" role="alert">{{ locationError() }}</p>
          }

          @if (lastLocation(); as location) {
            <p>
              <strong>Last shared coordinates:</strong>
              {{ location.latitude }}, {{ location.longitude }}
            </p>
          }
        </section>

        <section class="ride-section">
          <div class="section-heading">
            <h2>Available Rides</h2>
            <p>
  <strong>Ride notifications:</strong>
  {{ notificationConnectionStatus() }}
</p>

@if (incomingRequests().length > 0) {
  <section class="notification-list">
    <h3>New Ride Requests</h3>

    @for (request of incomingRequests(); track request.rideId) {
      <article class="ride-card">
        <h4>Ride #{{ request.rideId }}</h4>
        <p><strong>Pickup:</strong> {{ request.pickupAddress }}</p>
        <p><strong>Drop-off:</strong> {{ request.dropAddress }}</p>
        <p><strong>Type:</strong> {{ request.rideType }}</p>
        <p><strong>Estimated fare:</strong> ₹{{ request.estimatedFare }}</p>
        <p><strong>Distance from pickup:</strong> {{ request.distanceKm }} km</p>
      </article>
    }
  </section>
}
            <button
              type="button"
              [disabled]="ridesLoading() || rideActionId() !== null"
              (click)="refreshRides()"
            >
              Refresh
            </button>
          </div>

          @if (!p.online || p.verificationStatus !== 'APPROVED') {
            <p class="notice">
              You must be approved and online to receive ride requests.
            </p>
          } @else if (ridesLoading()) {
            <p>Loading available rides...</p>
          } @else if (ridesError()) {
            <p class="error" role="alert">{{ ridesError() }}</p>
          } @else if (availableRides().length === 0) {
            <p>No available ride requests right now.</p>
          } @else {
            <div class="ride-list">
              @for (ride of availableRides(); track ride.id) {
                <article class="ride-card">
                  <h3>Ride #{{ ride.id }}</h3>
                  <p><strong>Type:</strong> {{ ride.rideType }}</p>
                  <p><strong>Pickup:</strong> {{ ride.pickupAddress }}</p>
                  <p><strong>Drop-off:</strong> {{ ride.dropAddress }}</p>
                  <p><strong>Estimated fare:</strong> {{ ride.estimatedFare }}</p>
                  <p><strong>Status:</strong> {{ ride.status }}</p>

                  <div class="actions">
                    <button
                      type="button"
                      class="accept-button"
                      [disabled]="rideActionId() !== null"
                      (click)="acceptRide(ride)"
                    >
                      {{ rideActionId() === ride.id ? 'Processing...' : 'Accept' }}
                    </button>

                    <button
                      type="button"
                      class="reject-button"
                      [disabled]="rideActionId() !== null"
                      (click)="rejectRide(ride)"
                    >
                      Reject
                    </button>
                  </div>
                </article>
              }
            </div>
          }
        </section>

        <section class="ride-section">
          <div class="section-heading">
            <h2>Active Trips</h2>
            <button
              type="button"
              [disabled]="ridesLoading() || rideActionId() !== null"
              (click)="refreshRides()"
            >
              Refresh
            </button>
          </div>

          @if (ridesLoading()) {
            <p>Loading your trips...</p>
          } @else if (activeRides().length === 0) {
            <p>You have no active trips.</p>
          } @else {
            <div class="ride-list">
              @for (ride of activeRides(); track ride.id) {
                <article class="ride-card">
                  <h3>Ride #{{ ride.id }}</h3>
                  <p><strong>Pickup:</strong> {{ ride.pickupAddress }}</p>
                  <p><strong>Drop-off:</strong> {{ ride.dropAddress }}</p>
                  <p><strong>Status:</strong> {{ ride.status }}</p>
                  <p><strong>Estimated fare:</strong> {{ ride.estimatedFare }}</p>

                  <div class="actions">
                    @if (ride.status === 'ACCEPTED') {
                      <button
                        type="button"
                        [disabled]="rideActionId() !== null"
                        (click)="transitionRide(ride, 'arrived')"
                      >
                        Mark Arrived
                      </button>
                    }

                    @if (ride.status === 'ARRIVED') {
                      <button
                        type="button"
                        [disabled]="rideActionId() !== null"
                        (click)="transitionRide(ride, 'start')"
                      >
                        Start Trip
                      </button>
                    }

                    @if (ride.status === 'STARTED') {
                      <button
                        type="button"
                        class="accept-button"
                        [disabled]="rideActionId() !== null"
                        (click)="transitionRide(ride, 'complete')"
                      >
                        Complete Trip
                      </button>
                    }
                  </div>
                </article>
              }
            </div>
          }
        </section>

        <section class="ride-section">
  <div class="section-heading">
    <h2>Completed Trips</h2>
    <button
      type="button"
      [disabled]="ridesLoading()"
      (click)="loadCompletedRides()"
    >
      Refresh
    </button>
  </div>

  @if (completedRidesError()) {
    <p class="error" role="alert">{{ completedRidesError() }}</p>
  } @else if (completedRides().length === 0) {
    <p>No completed trips yet.</p>
  } @else {
    <div class="ride-list">
      @for (ride of completedRides(); track ride.id) {
        <article class="ride-card">
          <h3>Ride #{{ ride.id }}</h3>
          <p><strong>Pickup:</strong> {{ ride.pickupAddress }}</p>
          <p><strong>Drop-off:</strong> {{ ride.dropAddress }}</p>
          <p><strong>Status:</strong> {{ ride.status }}</p>
          <p>
            <strong>Final fare:</strong>
            ₹{{ ride.finalFare ?? ride.estimatedFare }}
          </p>
          <p>
            <strong>Completed at:</strong>
            {{ ride.completedAt ? (ride.completedAt | date:'medium') : 'Not available' }}
          </p>
        </article>
      }
    </div>
  }
</section>

        @if (rideMessage()) {
          <p class="success" role="status">{{ rideMessage() }}</p>
        }

        @if (rideActionError()) {
          <p class="error" role="alert">{{ rideActionError() }}</p>
        }
      }
    </main>
  `,
  styles: [`
    .dashboard {
      max-width: 900px;
      margin: 2rem auto;
      padding: 1.5rem;
    }

    .profile,
    .ride-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1rem;
    }

    .ride-section {
      margin-top: 2rem;
    }

    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .ride-list {
      display: grid;
      gap: 1rem;
    }

    .ride-card h3 {
      margin-top: 0;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    button {
      padding: 0.65rem 1rem;
      border: 0;
      border-radius: 6px;
      cursor: pointer;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .accept-button {
      background: #176b35;
      color: white;
    }

    .reject-button {
      background: #b42318;
      color: white;
    }

    .error {
      color: #b00020;
    }

    .notice {
      color: #805500;
    }

    .success {
      color: #176b35;
    }

    @media (max-width: 600px) {
      .section-heading {
        align-items: flex-start;
      }
    }
  `],
})
export class DriverDashboard implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly rideNotifications =
  inject(DriverRideNotificationService);
  private lastNotificationRideId: number | null = null;

  readonly profile = signal<DriverProfile | null>(null);
  readonly loading = signal(true);
  readonly updating = signal(false);
  readonly error = signal('');
  readonly statusMessage = signal('');
  readonly statusError = signal('');

  readonly locationUpdating = signal(false);
  readonly locationMessage = signal('');
  readonly locationError = signal('');
  readonly lastLocation = signal<{
    latitude: number;
    longitude: number;
  } | null>(null);

  readonly availableRides = signal<Ride[]>([]);
  readonly activeRides = signal<Ride[]>([]);
  readonly ridesLoading = signal(false);
  readonly ridesError = signal('');
  readonly rideActionError = signal('');
  readonly rideMessage = signal('');
  readonly rideActionId = signal<number | null>(null);
  readonly completedRides = signal<Ride[]>([]);
  readonly completedRidesError = signal('');
  readonly incomingRequests = this.rideNotifications.incomingRequests;
  readonly notificationConnectionStatus =
  this.rideNotifications.connectionStatus;

  private handleIncomingNotification(
  notification: RideRequestNotification,
): void {
  this.refreshRides();
}
private readonly notificationEffect = effect(() => {
  const requests = this.incomingRequests();
  const newestRide = requests[0];

  if (
    newestRide &&
    newestRide.rideId !== this.lastNotificationRideId
  ) {
    this.lastNotificationRideId = newestRide.rideId;

    if (this.profile()?.online) {
      this.refreshRides();
    }
  }
});

  ngOnInit(): void {
    this.loadProfile();
  }

  canGoOnline(profile: DriverProfile): boolean {
    return profile.verificationStatus === 'APPROVED';
  }

  toggleStatus(profile: DriverProfile): void {
    const online = !profile.online;

    if (online && !this.canGoOnline(profile)) {
      return;
    }

    this.updating.set(true);
    this.statusMessage.set('');
    this.statusError.set('');

    this.http.patch<DriverProfile>(
      `${environment.apiUrl}/driver/status`,
      { online },
    ).subscribe({
      next: (updatedProfile) => {
        this.profile.set(updatedProfile);
        this.statusMessage.set(
          `You are now ${updatedProfile.online ? 'online' : 'offline'}.`,
        );
        this.updating.set(false);

        if (updatedProfile.online) {
  this.rideNotifications.connect();
  this.refreshRides();
} else {
  this.rideNotifications.disconnect();
  this.availableRides.set([]);
}
      },
      error: (err: HttpErrorResponse) => {
        this.statusError.set(
          err.status === 403
            ? 'Your account is not permitted to change to this status.'
            : 'Unable to update status. Please try again.',
        );
        this.updating.set(false);
      },
    });
  }

  shareCurrentLocation(): void {
    this.locationMessage.set('');
    this.locationError.set('');

    if (!navigator.geolocation) {
      this.locationError.set(
        'Geolocation is not supported by this browser.',
      );
      return;
    }

    this.locationUpdating.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        this.http.put<DriverLocationResponse>(
          `${environment.apiUrl}/driver/location`,
          { latitude, longitude },
        ).subscribe({
          next: () => {
            this.lastLocation.set({ latitude, longitude });
            this.locationMessage.set(
              'Your location was shared successfully.',
            );
            this.locationUpdating.set(false);

            if (this.profile()?.online) {
              this.refreshRides();
            }
          },
          error: (err: HttpErrorResponse) => {
            this.locationError.set(
              err.status === 400
                ? 'The location was invalid. Please try again.'
                : err.status === 401
                  ? 'Your session has expired. Please log in again.'
                  : 'Unable to save your location. Please try again.',
            );
            this.locationUpdating.set(false);
          },
        });
      },
      (error: GeolocationPositionError) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Allow location access in your browser settings and try again.'
            : error.code === error.POSITION_UNAVAILABLE
              ? 'Your current location is unavailable. Check your device location settings and try again.'
              : 'Getting your location timed out. Please try again.';

        this.locationError.set(message);
        this.locationUpdating.set(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  }

  refreshRides(): void {
    const profile = this.profile();

    if (
      !profile ||
      !profile.online ||
      profile.verificationStatus !== 'APPROVED'
    ) {
      this.availableRides.set([]);
      this.loadActiveRidesOnly();
      return;
    }

    this.ridesLoading.set(true);
    this.ridesError.set('');

    this.http.get<Ride[]>(
      `${environment.apiUrl}/driver/rides/available`,
    ).subscribe({
      next: (rides) => {
        this.availableRides.set(rides);
        this.loadActiveRidesOnly();
      },
      error: (err: HttpErrorResponse) => {
        this.ridesError.set(
          err.status === 403
            ? 'Your driver profile must be approved and online to view available rides.'
            : err.status === 409
              ? 'Share your current location before searching for nearby rides.'
              : 'Unable to load available rides.',
        );
        this.loadActiveRidesOnly();
      },
    });
  }

  acceptRide(ride: Ride): void {
    this.performRideAction(
      ride,
      'accept',
      'Ride accepted successfully.',
    );
  }

  rejectRide(ride: Ride): void {
    this.performRideAction(
      ride,
      'reject',
      'Ride declined. It remains available for other drivers.',
    );
  }

  transitionRide(
    ride: Ride,
    action: 'arrived' | 'start' | 'complete',
  ): void {
    const messages = {
      arrived: 'Pickup arrival recorded.',
      start: 'Trip started.',
      complete: 'Trip completed successfully.',
    };

    this.performRideAction(ride, action, messages[action]);
  }

  private performRideAction(
    ride: Ride,
    action: string,
    successMessage: string,
  ): void {
    if (this.rideActionId() !== null) {
      return;
    }

    this.rideActionId.set(ride.id);
    this.rideActionError.set('');
    this.rideMessage.set('');

    this.http.patch<Ride>(
      `${environment.apiUrl}/driver/rides/${ride.id}/${action}`,
      {},
    ).subscribe({
      next: () => {
        this.rideActionId.set(null);
        this.rideMessage.set(successMessage);
        this.refreshRides();
      },
      error: (err: HttpErrorResponse) => {
        this.rideActionId.set(null);
        this.rideActionError.set(
          err.status === 409
            ? 'This ride has changed or is no longer available. Refresh and try again.'
            : err.status === 403
              ? 'You are not permitted to perform this ride action.'
              : err.status === 404
                ? 'Ride not found or it is not assigned to your account.'
                : 'Ride action failed. Please try again.',
        );
        this.refreshRides();
      },
    });
  }

  private loadActiveRidesOnly(): void {
    this.http.get<Ride[]>(
      `${environment.apiUrl}/driver/rides/active`,
    ).subscribe({
      next: (rides) => {
        this.activeRides.set(
          rides.filter((ride) =>
            ['ACCEPTED', 'ARRIVED', 'STARTED'].includes(ride.status),
          ),
        );
        this.ridesLoading.set(false);
      },
      error: () => {
        this.ridesLoading.set(false);
        this.ridesError.set('Unable to load your active trips.');
      },
    });
  }

  private loadProfile(): void {
    this.http.get<DriverProfile>(
      `${environment.apiUrl}/driver/profile`,
    ).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);

        if (profile.online && profile.verificationStatus === 'APPROVED') {
       this.rideNotifications.connect();
      }

        if (profile.online && profile.verificationStatus === 'APPROVED') {
          this.refreshRides();
        } else {
          this.loadActiveRidesOnly();
        }
      },
      error: () => {
        this.error.set(
          'Unable to load your driver profile. Please log in again or contact support.',
        );
        this.loading.set(false);
      },
    });
  }
  loadCompletedRides(): void {
  this.completedRidesError.set('');

  this.http.get<Ride[]>(
    `${environment.apiUrl}/driver/rides/completed`,
  ).subscribe({
    next: (rides) => {
      this.completedRides.set(rides);
    },
    error: () => {
      this.completedRidesError.set(
        'Unable to load completed trips. Please try again.',
      );
    },
  });
}
}
