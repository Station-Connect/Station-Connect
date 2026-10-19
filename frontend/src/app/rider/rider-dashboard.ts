
import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import {
  RiderProfile,
  RiderProfileService
} from './rider-profile.service';

@Component({
  selector: 'app-rider-dashboard',
  standalone: true,
  template: `
    <main class="dashboard">
      <h1>Rider Dashboard</h1>

      <p>Welcome, {{ auth.name() }}!</p>

      @if (loading()) {
        <p>Loading rider profile...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (profile()) {
        <section class="profile-card">
          <h2>My Profile</h2>

          <p><strong>User ID:</strong> {{ profile()!.userId }}</p>

          <p>
            <strong>Default Pickup:</strong>
            {{ profile()!.defaultPickupLocation ?? 'Not set' }}
          </p>

          <p>
            <strong>Payment Method:</strong>
            {{ profile()!.preferredPaymentMethod ?? 'Not set' }}
          </p>
        </section>
      }

      <button type="button" (click)="auth.logout()">
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

    .error {
      color: #c62828;
    }

    button {
      padding: 10px 20px;
      cursor: pointer;
    }
  `]
})
export class RiderDashboard implements OnInit {
  readonly auth = inject(AuthService);
  private readonly riderService = inject(RiderProfileService);

  readonly profile = signal<RiderProfile | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

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
            : 'Unable to load rider profile.'
        );
        this.loading.set(false);
      }
    });
  }
}
