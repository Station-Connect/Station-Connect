
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RiderProfile {
  userId: number;
  defaultPickupLocation: string | null;
  preferredPaymentMethod: string | null;
}

export interface RiderProfileUpdateRequest {
  defaultPickupLocation: string;
  preferredPaymentMethod: string;
}

@Injectable({
  providedIn: 'root'
})
export class RiderProfileService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl =
    `${environment.apiUrl}/rider/profile`;

  getProfile(): Observable<RiderProfile> {
    return this.http.get<RiderProfile>(this.baseUrl);
  }

  updateProfile(
    request: RiderProfileUpdateRequest
  ): Observable<RiderProfile> {
    return this.http.put<RiderProfile>(
      this.baseUrl,
      request
    );
  }
}
