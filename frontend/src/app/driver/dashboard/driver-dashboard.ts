
import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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

      @if (loading()) {
        <p>Loading driver profile...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (profile(); as p) {
        <section class="profile">
          <h2>Vehicle Details</h2>
          <p><strong>Vehicle type:</strong> {{ p.vehicleType }}</p>
          <p><strong>Vehicle number:</strong> {{ p.vehicleNumber }}</p>
          <p><strong>Verification:</strong> {{ p.verificationStatus }}</p>
          <p><strong>Average rating:</strong>
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
    .profile {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1rem;
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
    .error { color: #b00020; }
    .notice { color: #805500; }
  `],
})
export class DriverDashboard implements OnInit {
  private readonly http = inject(HttpClient);

  readonly profile = signal<DriverProfile | null>(null);
  readonly loading = signal(true);
  readonly updating = signal(false);
  readonly error = signal('');
  readonly statusMessage = signal('');
  readonly statusError = signal('');

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
      },
      error: (err) => {
        this.statusError.set(
          err.status === 403
            ? 'Your account is not permitted to change to this status.'
            : 'Unable to update status. Please try again.',
        );
        this.updating.set(false);
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
      },
      error: () => {
        this.error.set(
          'Unable to load your driver profile. Please log in again or contact support.',
        );
        this.loading.set(false);
      },
    });
  }
}
