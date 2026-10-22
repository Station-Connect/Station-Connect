import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface DriverProfile {
  userId: number;
  vehicleType: string;
  vehicleNumber: string;
  documentUrl: string | null;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  online: boolean;
  averageRating: number | null;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard implements OnInit {
  private readonly http = inject(HttpClient);

  readonly drivers = signal<DriverProfile[]>([]);
  readonly loading = signal(false);
  readonly actionInProgress = signal<number | null>(null);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  ngOnInit(): void {
    this.loadPendingDrivers();
  }

  loadPendingDrivers(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.http.get<DriverProfile[]>(
      `${environment.apiUrl}/admin/drivers/pending`,
    ).subscribe({
      next: (drivers) => {
        this.drivers.set(drivers);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.status === 401
            ? 'Your session has expired. Please log in again.'
            : err.status === 403
              ? 'Admin access is required to view pending drivers.'
              : 'Unable to load pending drivers. Check the backend connection.',
        );
        this.loading.set(false);
      },
    });
  }

  updateVerification(
    driver: DriverProfile,
    status: 'APPROVED' | 'REJECTED',
  ): void {
    if (this.actionInProgress() !== null) {
      return;
    }

    this.actionInProgress.set(driver.userId);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.http.patch<DriverProfile>(
      `${environment.apiUrl}/admin/drivers/${driver.userId}/verification`,
      { status },
    ).subscribe({
      next: () => {
        this.actionInProgress.set(null);
        this.successMessage.set(
          `Driver ${driver.userId} ${status.toLowerCase()} successfully.`,
        );
        this.loadPendingDrivers();
      },
      error: (err: HttpErrorResponse) => {
        this.actionInProgress.set(null);
        this.errorMessage.set(
          err.status === 401
            ? 'Your session has expired. Please log in again.'
            : err.status === 403
              ? 'Only an administrator can approve or reject drivers.'
              : err.status === 404
                ? 'Driver profile not found. Refresh the list.'
                : 'Unable to update driver verification. Please try again.',
        );
      },
    });
  }
}
