
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FareEstimateRequest {
  pickupLatitude: number;
  pickupLongitude: number;
  dropLatitude: number;
  dropLongitude: number;
}

export interface FareEstimateResponse {
  distanceKm: number;
  durationMinutes: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  totalFare: number;
}

@Injectable({
  providedIn: 'root'
})
export class FareService {
  private readonly http = inject(HttpClient);

  private readonly url =
    `${environment.apiUrl}/rider/fare/estimate`;

  estimateFare(
    request: FareEstimateRequest
  ): Observable<FareEstimateResponse> {
    return this.http.post<FareEstimateResponse>(
      this.url,
      request
    );
  }
}
