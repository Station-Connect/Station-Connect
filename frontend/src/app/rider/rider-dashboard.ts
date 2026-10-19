
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../core/auth.service';
import {
  RiderProfile,
  RiderProfileService
} from './rider-profile.service';
import { RiderMap } from './rider-map';

@Component({
  selector: 'app-rider-dashboard',
  standalone: true,
  imports: [FormsModule, RiderMap],
  template: `
    <main class="dashboard">
      <h1>Rider Dashboard</h1>

      <p>Welcome, {{ auth.name() }}!</p>

      @if (loading()) {
        <p>Loading rider profile...</p>
      } @else if (error() && !profile()) {
        <p class="error">{{ error() }}</p>
      } @else if (profile()) {
        <section class="profile-card">
          <h2>My Profile</h2>

          <p>
            <strong>User ID:</strong>
            {{ profile()!.userId }}
          </p>

          @if (!editing()) {
            <p>
              <strong>Default Pickup:</strong>
              {{ profile()!.defaultPickupLocation ?? 'Not set' }}
            </p>

            <p>
              <strong>Payment Method:</strong>
              {{ profile()!.preferredPaymentMethod ?? 'Not set' }}
            </p>

            <button type="button" (click)="startEditing()">
              Edit Profile
            </button>
          } @else {
            <form (ngSubmit)="saveProfile()">
              <div class="form-group">
                <label for="pickup">
                  Default Pickup Location
                </label>

                <input
                  id="pickup"
                  name="pickup"
                  type="text"
                  maxlength="255"
                  [(ngModel)]="pickupLocation"
                  placeholder="Enter pickup location"
                  required
                />
              </div>

              <div class="form-group">
                <label for="payment">
                  Preferred Payment Method
                </label>

                <select
                  id="payment"
                  name="payment"
                  [(ngModel)]="paymentMethod"
                  required
                >
                  <option value="">Select payment method</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div class="actions">
                <button
                  type="submit"
                  [disabled]="saving() ||
                    !pickupLocation.trim() ||
                    !paymentMethod"
                >
                  {{ saving() ? 'Saving...' : 'Save Changes' }}
                </button>

                <button
                  type="button"
                  [disabled]="saving()"
                  (click)="cancelEditing()"
                >
                  Cancel
                </button>
              </div>
            </form>
          }

          @if (success()) {
            <p class="success">{{ success() }}</p>
          }

          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
        </section>

        <!-- Leaflet Route Selection -->
        <app-rider-map />
      }

      <button
        class="logout"
        type="button"
        (click)="auth.logout()"
      >
        Logout
      </button>
    </main>
  `,
  styles: [`
    .dashboard {
      max-width: 800px;
      margin: 40px auto;
      padding: 24px;
      font-family: Arial, sans-serif;
    }

    .profile-card {
      padding: 24px;
      margin: 20px 0;
      border: 1px solid #ddd;
      border-radius: 12px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 18px;
    }

    label {
      font-weight: bold;
    }

    input, select {
      padding: 10px;
      border: 1px solid #bbb;
      border-radius: 6px;
      font-size: 15px;
    }

    .actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
      flex-wrap: wrap;
    }

    button {
      padding: 10px 20px;
      cursor: pointer;
      border: 1px solid #bbb;
      border-radius: 6px;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .logout {
      margin-top: 24px;
    }

    .error {
      color: #c62828;
    }

    .success {
      color: #2e7d32;
      font-weight: bold;
    }
  `]
})
export class RiderDashboard implements OnInit {

  readonly auth = inject(AuthService);
  private readonly riderService = inject(RiderProfileService);

  readonly profile = signal<RiderProfile | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal(false);

  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  pickupLocation = '';
  paymentMethod = '';

  ngOnInit(): void {
    this.riderService.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(
          err.status === 401
            ? 'Session expired. Please log in again.'
            : err.status === 403
              ? 'You do not have permission to access this profile.'
              : 'Unable to load rider profile.'
        );

        this.loading.set(false);
      }
    });
  }

  startEditing(): void {
    const currentProfile = this.profile();

    if (!currentProfile) return;

    this.pickupLocation =
      currentProfile.defaultPickupLocation ?? '';

    this.paymentMethod =
      currentProfile.preferredPaymentMethod ?? '';

    this.error.set(null);
    this.success.set(null);
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.error.set(null);
  }

  saveProfile(): void {
    if (this.saving()) return;

    const pickup = this.pickupLocation.trim();

    if (!pickup || !this.paymentMethod) {
      this.error.set('Please fill in all fields.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    this.riderService.updateProfile({
      defaultPickupLocation: pickup,
      preferredPaymentMethod: this.paymentMethod
    }).subscribe({
      next: (updatedProfile) => {
        this.profile.set(updatedProfile);
        this.editing.set(false);
        this.saving.set(false);
        this.success.set('Profile updated successfully!');
      },
      error: (err) => {
        this.error.set(
          err.status === 401
            ? 'Session expired. Please log in again.'
            : err.status === 403
              ? 'You do not have permission to update this profile.'
              : 'Failed to update profile. Please try again.'
        );

        this.saving.set(false);
      }
    });
  }
}
