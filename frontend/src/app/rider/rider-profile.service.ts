
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RiderProfile {
  userId: number;
  defaultPickupLocation: string | null;
  preferredPaymentMethod: string | null;
}

@Injectable({ providedIn: 'root' })
export class RiderProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rider`;

  getProfile(): Observable<RiderProfile> {
    return this.http.get<RiderProfile>(
      `${this.baseUrl}/profile`
    );
  }
}
