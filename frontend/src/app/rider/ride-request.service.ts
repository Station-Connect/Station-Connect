import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RideRequestPayload {
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropAddress: string;
  dropLatitude: number;
  dropLongitude: number;
  rideType: string;
}

export interface NearbyDriver {
  driverId: number;
  distanceKm: number;
}

export interface Ride {
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

export interface RideRequestResponse {
  ride: Ride;
  nearbyDrivers: NearbyDriver[];
}

@Injectable({
  providedIn: 'root'
})
export class RideRequestService {
  private readonly http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/rider/rides`;

  requestRide(
    request: RideRequestPayload
  ): Observable<RideRequestResponse> {
    return this.http.post<RideRequestResponse>(
      this.url,
      request
    );
  }

  getRide(rideId: number): Observable<Ride> {
    return this.http.get<Ride>(
      `${this.url}/${rideId}`
    );
  }
}