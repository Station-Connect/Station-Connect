import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  selector: 'app-registration',
  standalone: true,
  imports: [FormsModule],
  styleUrl: './registration.scss',
  templateUrl: './registration.html',
})
export class Registration {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  vehicleType = '';
  vehicleNumber = '';
  documentUrl = '';

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  submitForm(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    const type = this.vehicleType.trim();
    const number = this.vehicleNumber.trim().toUpperCase();
    const document = this.documentUrl.trim();

    if (!type || !number) {
      this.errorMessage.set('Vehicle type and vehicle number are required.');
      return;
    }

    if (type.length > 50 || number.length > 20) {
      this.errorMessage.set('Vehicle type or vehicle number is too long.');
      return;
    }

    this.submitting.set(true);

    this.http.post<unknown>(
      `${environment.apiUrl}/driver/profile`,
      {
        vehicleType: type,
        vehicleNumber: number,
        documentUrl: document || null,
      },
    ).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set(
          'Vehicle details submitted. Your profile is pending approval.',
        );

        void this.router.navigate(['/driver']);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);

        if (err.status === 409) {
          this.errorMessage.set(
            'A driver profile already exists for your account.',
          );
        } else if (err.status === 400) {
          this.errorMessage.set(
            'Please check your vehicle details and try again.',
          );
        } else if (err.status === 401 || err.status === 403) {
          this.errorMessage.set(
            'Please log in with a valid driver account.',
          );
        } else {
          this.errorMessage.set(
            'Unable to submit vehicle details. Please try again.',
          );
        }
      },
    });
  }
}