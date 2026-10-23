
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DriverRideNotificationService,
  RideRequestNotification,
} from '../driver-ride-notification.service';

interface DriverProfile {
  userId: number;
  vehicleType: string;
  vehicleNumber: string;
  documentUrl: string | null;
  verificationStatus: string;
  online: boolean;
  averageRating: number | null;
}

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  template: `
    <main class="dashboard">
      <h1>Driver Dashboard</h1>

      <section class="connection">
        <h2>Live ride notifications</h2>

        <p>
          Connection:
          <strong>{{ notifications.connectionStatus() }}</strong>
        </p>

        @if (profile(); as p) {
          @if (!p.online) {
            <p class="notice">
              Go online to become eligible for ride requests.
            </p>
          }
        }

        @if (notifications.incomingRequests().length === 0) {
          <p>No incoming ride requests at the moment.</p>
        } @else {
          @for (
            request of notifications.incomingRequests();
            track request.rideId
          ) {
            <article class="ride-card">
              <h3>Ride #{{ request.rideId }}</h3>

              <p>
                <strong>Pickup:</strong>
                {{ request.pickupAddress }}
              </p>

              <p>
                <strong>Drop-off:</strong>
                {{ request.dropAddress }}
              </p>

              <p>
                <strong>Ride type:</strong>
                {{ request.rideType }}
              </p>

              <p>
                <strong>Distance to pickup:</strong>
                {{ request.distanceKm }} km
              </p>

              <p>
                <strong>Estimated fare:</strong>
                {{ request.estimatedFare }}
              </p>

              <div class="actions">
                <button
                  type="button"
                  [disabled]="busyRideId() !== null"
                  (click)="acceptRide(request)"
                >
                  Accept
                </button>

                <button
                  type="button"
                  class="secondary"
                  [disabled]="busyRideId() !== null"
                  (click)="rejectRide(request)"
                >
                  Reject
                </button>
              </div>
            </article>
          }
        }

        @if (rideMessage()) {
          <p>{{ rideMessage() }}</p>
        }

        @if (rideError()) {
          <p class="error">{{ rideError() }}</p>
        }
      </section>

      @if (loading()) {
        <p>Loading driver profile...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (profile(); as p) {
        <section class="profile">
          <h2>Vehicle Details</h2>

          <p>
            <strong>Vehicle type:</strong>
            {{ p.vehicleType }}
          </p>

          <p>
            <strong>Vehicle number:</strong>
            {{ p.vehicleNumber }}
          </p>

          <p>
            <strong>Verification:</strong>
            {{ p.verificationStatus }}
          </p>

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

          <p>
            <strong>Location:</strong>
            {{ locationStatus() }}
          </p>

          @if (locationError()) {
            <p class="error">{{ locationError() }}</p>
          }

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
            <p>{{ statusMessage() }}</p>
          }

          @if (statusError()) {
            <p class="error">{{ statusError() }}</p>
          }
        </section>
      }
    </main>
  `,
  styles: [`
    .dashboard {
      max-width: 720px;
      margin: 2rem auto;
      padding: 1.5rem;
    }

    .profile,
    .connection,
    .ride-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .ride-card {
      background: #fafafa;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    button {
      padding: 0.65rem 1rem;
      border: 0;
      border-radius: 6px;
      cursor: pointer;
    }

    button.secondary {
      background: #eee;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .error {
      color: #b00020;
    }

    .notice {
      color: #805500;
    }
  `],
})
export class DriverDashboard implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);

  readonly notifications = inject(DriverRideNotificationService);

  readonly profile = signal<DriverProfile | null>(null);
  readonly loading = signal(true);
  readonly updating = signal(false);
  readonly error = signal('');
  readonly statusMessage = signal('');
  readonly statusError = signal('');
  readonly rideMessage = signal('');
  readonly rideError = signal('');
  readonly busyRideId = signal<number | null>(null);

  readonly locationStatus = signal('Location tracking is inactive.');
  readonly locationError = signal('');

  private rideActionSubscription?: Subscription;
  private statusSubscription?: Subscription;
  private locationRequestSubscription?: Subscription;

  private locationIntervalId?: number;
  private locationTracking = false;
  private locationUpdateInFlight = false;

  ngOnInit(): void {
    this.loadProfile();
    this.notifications.connect();
  }

  ngOnDestroy(): void {
    this.stopLocationUpdates();
    this.rideActionSubscription?.unsubscribe();
    this.statusSubscription?.unsubscribe();
    this.notifications.disconnect();
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

    this.statusSubscription?.unsubscribe();

    this.statusSubscription = this.http.patch<DriverProfile>(
      `${environment.apiUrl}/driver/status`,
      { online },
    ).subscribe({
      next: (updatedProfile: DriverProfile) => {
        this.profile.set(updatedProfile);
        this.updating.set(false);

        if (updatedProfile.online) {
          this.startLocationUpdates();
        } else {
          this.stopLocationUpdates();
        }

        this.statusMessage.set(
          `You are now ${updatedProfile.online ? 'online' : 'offline'}.`,
        );
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

  acceptRide(request: RideRequestNotification): void {
    this.performRideAction(
      request,
      'accept',
      'Ride accepted successfully.',
    );
  }

  rejectRide(request: RideRequestNotification): void {
    this.performRideAction(
      request,
      'reject',
      'Ride offer dismissed.',
    );
  }

  private performRideAction(
    request: RideRequestNotification,
    action: 'accept' | 'reject',
    successMessage: string,
  ): void {
    if (this.busyRideId() !== null) {
      return;
    }

    this.busyRideId.set(request.rideId);
    this.rideMessage.set('');
    this.rideError.set('');

    this.rideActionSubscription?.unsubscribe();

    this.rideActionSubscription = this.http.patch<unknown>(
      `${environment.apiUrl}/driver/rides/${request.rideId}/${action}`,
      {},
    ).subscribe({
      next: (_response: unknown) => {
        this.notifications.removeRequest(request.rideId);
        this.rideMessage.set(successMessage);
        this.busyRideId.set(null);

        if (action === 'accept') {
          this.loadProfile();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.rideError.set(
          err.status === 409
            ? 'This ride is no longer available. Refresh your requests.'
            : err.status === 403
              ? 'You must be an approved, online driver to perform this action.'
              : 'Unable to process the ride action. Please try again.',
        );

        this.busyRideId.set(null);
      },
    });
  }

  private loadProfile(): void {
    this.http.get<DriverProfile>(
      `${environment.apiUrl}/driver/profile`,
    ).subscribe({
      next: (profile: DriverProfile) => {
        this.profile.set(profile);
        this.loading.set(false);

        if (profile.online) {
          this.startLocationUpdates();
        } else {
          this.stopLocationUpdates();
        }
      },
      error: (_err: HttpErrorResponse) => {
        this.error.set(
          'Unable to load your driver profile. Please log in again or contact support.',
        );

        this.loading.set(false);
      },
    });
  }

  private startLocationUpdates(): void {
    if (this.locationTracking) {
      return;
    }

    if (!navigator.geolocation) {
      this.locationStatus.set(
        'Location is unsupported by this browser.',
      );
      this.locationError.set(
        'Use a browser that supports geolocation.',
      );
      return;
    }

    this.locationTracking = true;
    this.locationError.set('');
    this.locationStatus.set('Requesting your location...');

    // Send the first location immediately.
    this.updateDriverLocation();

    // Refresh the saved location every 60 seconds.
    this.locationIntervalId = window.setInterval(() => {
      this.updateDriverLocation();
    }, 60_000);
  }

  private updateDriverLocation(): void {
    if (!this.locationTracking || this.locationUpdateInFlight) {
      return;
    }

    this.locationUpdateInFlight = true;

    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition) => {
        if (!this.locationTracking) {
          this.locationUpdateInFlight = false;
          return;
        }

        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        this.locationRequestSubscription?.unsubscribe();

        this.locationRequestSubscription = this.http.put<unknown>(
          `${environment.apiUrl}/driver/location`,
          { latitude, longitude },
        ).subscribe({
          next: () => {
            this.locationStatus.set('Location updated successfully.');
            this.locationError.set('');
            this.locationUpdateInFlight = false;
          },
          error: (err: HttpErrorResponse) => {
            this.locationStatus.set('Unable to update location.');

            this.locationError.set(
              err.status === 401
                ? 'Your session has expired. Please log in again.'
                : err.status === 403
                  ? 'Your account cannot update its location.'
                  : 'Location update failed. Check your connection and try again.',
            );

            this.locationUpdateInFlight = false;
          },
        });
      },
      (error: GeolocationPositionError) => {
        this.locationUpdateInFlight = false;
        this.locationStatus.set('Unable to obtain your location.');

        this.locationError.set(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Allow location access in your browser settings.'
            : error.code === error.POSITION_UNAVAILABLE
              ? 'Your current position is unavailable. Check your device location settings.'
              : 'Location request timed out. The dashboard will retry.',
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 10_000,
      },
    );
  }

  private stopLocationUpdates(): void {
    this.locationTracking = false;

    if (this.locationIntervalId !== undefined) {
      window.clearInterval(this.locationIntervalId);
      this.locationIntervalId = undefined;
    }

    this.locationRequestSubscription?.unsubscribe();
    this.locationRequestSubscription = undefined;

    this.locationUpdateInFlight = false;
    this.locationStatus.set('Location tracking is inactive.');
    this.locationError.set('');
  }
}
