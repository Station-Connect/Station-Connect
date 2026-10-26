import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import * as L from 'leaflet';

import {
  Subject,
  Subscription,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  of,
  interval,
  startWith
} from 'rxjs';

import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';

import { environment } from '../../environments/environment';

import {
  LocationSearchService,
  LocationResult
} from './location-search.service';

import {
  FareService,
  FareEstimateResponse
} from './fare.service';

import {
  RideRequestService,
  RideRequestResponse,
  Ride
} from './ride-request.service';

type LocationMode = 'pickup' | 'drop';
type RideType = 'SOLO' | 'SHARED';

interface DriverTrackingResponse {
  rideId: number;
  rideStatus: string;
  driverId: number | null;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string | null;
}

@Component({
  selector: 'app-rider-map',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe],
  template: `
    <section class="map-section">
      <h2>Select Your Route</h2>

      <p>Search for an address or click on the map.</p>

      <div class="search-group">
        <label for="locationSearch">Search location</label>

        <input
          id="locationSearch"
          type="text"
          name="locationSearch"
          [ngModel]="searchText()"
          (ngModelChange)="onSearchChange($event)"
          placeholder="e.g. Pune Railway Station"
          autocomplete="off"
        />

        @if (searching()) {
          <p>Searching locations...</p>
        }

        @if (searchError()) {
          <p class="error">{{ searchError() }}</p>
        }

        @if (results().length > 0) {
          <div class="results">
            @for (result of results(); track result.place_id) {
              <button
                type="button"
                class="result-item"
                (click)="selectSearchResult(result)"
              >
                {{ result.display_name }}
              </button>
            }
          </div>
        }
      </div>

      <div class="controls">
        <button
          type="button"
          (click)="selectionMode.set('pickup')"
          [class.active]="selectionMode() === 'pickup'"
        >
          Select Pickup
        </button>

        <button
          type="button"
          (click)="selectionMode.set('drop')"
          [class.active]="selectionMode() === 'drop'"
        >
          Select Drop
        </button>
      </div>

      <p class="selection-hint">
        Currently selecting: {{ selectionMode() }}
      </p>

      <div #mapContainer class="map"></div>

      <div class="locations">
        <p>
          <strong>Pickup:</strong>
          {{ pickupText() }}
        </p>

        <p>
          <strong>Drop:</strong>
          {{ dropText() }}
        </p>
      </div>

      @if (fareLoading()) {
        <p class="loading">Calculating estimated fare...</p>
      }

      @if (fareError()) {
        <p class="error">{{ fareError() }}</p>
      }

      @if (fare(); as f) {
        <section class="fare-card">
          <h2>Fare Estimate</h2>

          <div class="fare-row">
            <span>Distance</span>
            <strong>
              {{ f.distanceKm | number:'1.2-2' }} km
            </strong>
          </div>

          <div class="fare-row">
            <span>Estimated Duration</span>
            <strong>
              {{ f.durationMinutes | number:'1.2-2' }} min
            </strong>
          </div>

          <hr />

          <div class="fare-row">
            <span>Base Fare</span>
            <strong>
              ₹{{ f.baseFare | number:'1.2-2' }}
            </strong>
          </div>

          <div class="fare-row">
            <span>Distance Fare</span>
            <strong>
              ₹{{ f.distanceFare | number:'1.2-2' }}
            </strong>
          </div>

          <div class="fare-row">
            <span>Time Fare</span>
            <strong>
              ₹{{ f.timeFare | number:'1.2-2' }}
            </strong>
          </div>

          <hr />

          <div class="fare-row total">
            <span>Total Estimated Fare</span>
            <strong>
              ₹{{ f.totalFare | number:'1.2-2' }}
            </strong>
          </div>

          <p class="note">
            Estimated fare may change based on the route.
          </p>
        </section>
      }

      <section class="ride-request-card">
        <h2>Book Your Ride</h2>

        <label for="rideType">Choose ride type</label>

        <select
          id="rideType"
          name="rideType"
          [ngModel]="rideType()"
          (ngModelChange)="onRideTypeChange($event)"
        >
          <option value="SOLO">Solo Ride</option>
          <option value="SHARED">Shared Ride</option>
        </select>

        <button
          type="button"
          class="request-button"
          (click)="requestRide()"
          [disabled]="
            requestingRide() ||
            !pickupCoordinates ||
            !dropCoordinates ||
            !fare() ||
            fareLoading() ||
            !!rideRequestResult()
          "
        >
          {{
            requestingRide()
              ? 'Requesting Ride...'
              : rideRequestResult()
                ? 'Ride Requested'
                : 'Request Ride'
          }}
        </button>

        @if (rideRequestError()) {
          <p class="error">{{ rideRequestError() }}</p>
        }

        @if (rideRequestResult(); as result) {
          <div class="ride-result">
            <h3>Ride Request Submitted</h3>

            <p>
              <strong>Ride ID:</strong>
              {{ result.ride.id }}
            </p>

            <p>
              <strong>Status:</strong>
              {{ result.ride.status }}
            </p>

            <p>
              <strong>Ride type:</strong>
              {{ result.ride.rideType }}
            </p>

            <p>
              <strong>Estimated fare:</strong>
              ₹{{ result.ride.estimatedFare | number:'1.2-2' }}
            </p>

            <p>
              <strong>Nearby drivers found:</strong>
              {{ result.nearbyDrivers.length }}
            </p>

            <p>
              Your ride is submitted. Driver tracking will begin
              when a driver accepts and shares a location.
            </p>

            <button
              type="button"
              class="secondary-button"
              (click)="prepareAnotherRide()"
            >
              Plan Another Ride
            </button>
          </div>

          @let ride = latestRide() ?? result.ride;

          <section class="trip-summary">
            <h3>Trip Summary</h3>

            <p>
              <strong>Ride ID:</strong>
              {{ ride.id }}
            </p>

            <p>
              <strong>Pickup:</strong>
              {{ ride.pickupAddress }}
            </p>

            <p>
              <strong>Drop-off:</strong>
              {{ ride.dropAddress }}
            </p>

            <p>
              <strong>Ride type:</strong>
              {{ ride.rideType }}
            </p>

            <p>
              <strong>Status:</strong>
              <span
                class="status-badge"
                [class.status-completed]="ride.status === 'COMPLETED'"
                [class.status-cancelled]="
                  ride.status === 'CANCELLED' ||
                  ride.status === 'REJECTED'
                "
              >
                {{ ride.status }}
              </span>
            </p>

            <p>
              <strong>Estimated fare:</strong>
              ₹{{ ride.estimatedFare | number:'1.2-2' }}
            </p>

            @if (ride.status === 'COMPLETED') {
              <div class="final-fare-card">
                <p class="final-fare-label">
                  Final Fare
                </p>

                <p class="final-fare-amount">
                  ₹{{
                    (ride.finalFare ?? ride.estimatedFare)
                      | number:'1.2-2'
                  }}
                </p>

                @if (ride.completedAt) {
                  <p class="completed-time">
                    Completed:
                    {{ ride.completedAt | date:'medium' }}
                  </p>
                }
              </div>
            } @else if (
              ride.status !== 'CANCELLED' &&
              ride.status !== 'REJECTED'
            ) {
              <p class="trip-note">
                Your trip details will refresh automatically.
              </p>
            }
          </section>
        }

        @if (
  trackingRideId() !== null &&
  !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(
    driverTracking()?.rideStatus ?? ''
  )
) {
          <section class="tracking-card">
            <h2>Live Driver Tracking</h2>

            <p>
              <strong>Ride ID:</strong>
              {{ trackingRideId() }}
            </p>

            @if (trackingLoading()) {
              <p>Checking driver assignment...</p>
            }

            @if (trackingError()) {
              <p class="error">{{ trackingError() }}</p>
            }

            @if (trackingMessage()) {
              <p>{{ trackingMessage() }}</p>
            }

            @if (driverTracking(); as tracking) {
              <p>
                <strong>Ride status:</strong>
                {{ tracking.rideStatus }}
              </p>

              @if (tracking.driverId !== null) {
                <p>
                  <strong>Driver ID:</strong>
                  {{ tracking.driverId }}
                </p>
              }

              @if (
                tracking.latitude !== null &&
                tracking.longitude !== null
              ) {
                <p>
                  <strong>Driver coordinates:</strong>
                  {{ tracking.latitude | number:'1.5-5' }},
                  {{ tracking.longitude | number:'1.5-5' }}
                </p>

                @if (tracking.locationUpdatedAt) {
                  <p>
                    <strong>Location last updated:</strong>
                    {{ tracking.locationUpdatedAt | date:'medium' }}
                  </p>
                }
              }
            }

            @if (trackingStopped()) {
              <button
                type="button"
                class="secondary-button"
                (click)="stopTracking()"
              >
                Stop Tracking
              </button>
            }
          </section>
        }
      </section>
    </section>
  `,
  styles: [`
    .map-section {
      margin-top: 24px;
    }

    .search-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 16px 0;
    }

    .search-group input {
      padding: 12px;
      border: 1px solid #bbb;
      border-radius: 6px;
      font-size: 15px;
    }

    .results {
      border: 1px solid #ddd;
      border-radius: 6px;
      max-height: 220px;
      overflow-y: auto;
    }

    .result-item {
      display: block;
      width: 100%;
      padding: 12px;
      text-align: left;
      border: none;
      border-bottom: 1px solid #eee;
      background: white;
      cursor: pointer;
    }

    .result-item:hover {
      background: #f1f5f9;
    }

    .controls {
      display: flex;
      gap: 12px;
      margin: 16px 0;
      flex-wrap: wrap;
    }

    .controls button,
    .secondary-button {
      padding: 10px 16px;
      cursor: pointer;
      border: 1px solid #bbb;
      border-radius: 6px;
      background: white;
    }

    .controls button.active {
      background: #2563eb;
      color: white;
      border-color: #2563eb;
    }

    .selection-hint {
      color: #64748b;
      font-size: 13px;
    }

    .map {
      height: 400px;
      width: 100%;
      border-radius: 12px;
      z-index: 0;
    }

    .locations {
      margin-top: 16px;
      overflow-wrap: anywhere;
    }

    .fare-card,
    .ride-request-card,
    .tracking-card {
      margin-top: 24px;
      padding: 24px;
      border: 1px solid #ddd;
      border-radius: 12px;
      background: #f8fafc;
    }

    .fare-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin: 14px 0;
    }

    .total {
      color: #15803d;
      font-size: 20px;
      font-weight: bold;
    }

    .loading {
      color: #2563eb;
      font-weight: bold;
    }

    .error {
      color: #c62828;
      overflow-wrap: anywhere;
    }

    .note {
      color: #64748b;
      font-size: 13px;
    }

    .ride-request-card select {
      display: block;
      width: 100%;
      max-width: 320px;
      margin: 10px 0 16px;
      padding: 10px;
      border: 1px solid #bbb;
      border-radius: 6px;
      background: white;
    }

    .request-button {
      padding: 12px 20px;
      border: none;
      border-radius: 6px;
      background: #2563eb;
      color: white;
      cursor: pointer;
      font-weight: bold;
    }

    .request-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .ride-result {
      margin-top: 18px;
      padding: 14px;
      border-radius: 8px;
      background: #f0fdf4;
      overflow-wrap: anywhere;
    }

    .trip-summary {
      margin-top: 18px;
      padding: 20px;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      background: white;
      overflow-wrap: anywhere;
    }

    .trip-summary h3 {
      margin-top: 0;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 13px;
      font-weight: bold;
    }

    .status-completed {
      background: #dcfce7;
      color: #166534;
    }

    .status-cancelled {
      background: #fee2e2;
      color: #991b1b;
    }

    .final-fare-card {
      margin-top: 18px;
      padding: 18px;
      border: 1px solid #86efac;
      border-radius: 10px;
      background: #f0fdf4;
    }

    .final-fare-label {
      margin: 0;
      color: #166534;
      font-weight: bold;
    }

    .final-fare-amount {
      margin: 8px 0;
      color: #15803d;
      font-size: 28px;
      font-weight: bold;
    }

    .completed-time {
      color: #166534;
      font-size: 13px;
    }

    .trip-note {
      color: #64748b;
      font-size: 13px;
    }

    .tracking-card {
      background: #eff6ff;
      overflow-wrap: anywhere;
    }
  `]
})
export class RiderMap implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer')
  mapContainer!: ElementRef<HTMLDivElement>;

  private readonly http = inject(HttpClient);
  private readonly locationService = inject(LocationSearchService);
  private readonly fareService = inject(FareService);
  private readonly rideRequestService = inject(RideRequestService);

  private readonly searchSubject = new Subject<string>();

  private searchSubscription?: Subscription;
  private fareSubscription?: Subscription;
  private trackingSubscription?: Subscription;
  private rideDetailsSubscription?: Subscription;

  private map?: L.Map;
  private pickupMarker?: L.CircleMarker;
  private dropMarker?: L.CircleMarker;
  private driverMarker?: L.CircleMarker;

  pickupCoordinates: L.LatLng | null = null;
  dropCoordinates: L.LatLng | null = null;

  readonly selectionMode = signal<LocationMode>('pickup');

  readonly pickupText = signal('Not selected');
  readonly dropText = signal('Not selected');

  readonly searchText = signal('');
  readonly results = signal<LocationResult[]>([]);
  readonly searching = signal(false);
  readonly searchError = signal<string | null>(null);

  readonly fare = signal<FareEstimateResponse | null>(null);
  readonly fareLoading = signal(false);
  readonly fareError = signal<string | null>(null);

  readonly rideType = signal<RideType>('SOLO');
  readonly requestingRide = signal(false);
  readonly rideRequestError = signal<string | null>(null);
  readonly rideRequestResult =
    signal<RideRequestResponse | null>(null);

  readonly latestRide = signal<Ride | null>(null);

  readonly trackingRideId = signal<number | null>(null);
  readonly driverTracking =
    signal<DriverTrackingResponse | null>(null);

  readonly trackingLoading = signal(false);
  readonly trackingError = signal<string | null>(null);
  readonly trackingMessage = signal('');
  readonly trackingStopped = signal(false);

  constructor() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(1100),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.trim().length < 3) {
          this.searching.set(false);
          return of([] as LocationResult[]);
        }

        this.searching.set(true);
        this.searchError.set(null);

        return this.locationService.search(query).pipe(
          catchError(() => {
            this.searchError.set(
              'Unable to search locations.'
            );

            return of([] as LocationResult[]);
          })
        );
      })
    ).subscribe(results => {
      this.results.set(results);
      this.searching.set(false);
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer.nativeElement)
      .setView([18.5204, 73.8567], 12);

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }
    ).addTo(this.map);

    this.map.on(
      'click',
      (event: L.LeafletMouseEvent) => {
        this.selectLocation(event.latlng);
      }
    );
  }

  onSearchChange(query: string): void {
    this.searchText.set(query);
    this.results.set([]);
    this.searchError.set(null);

    if (query.trim().length < 3) {
      this.searching.set(false);
    }

    this.searchSubject.next(query.trim());
  }

  selectSearchResult(result: LocationResult): void {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    const location = L.latLng(latitude, longitude);

    this.selectLocation(location, result.display_name);
    this.map?.setView(location, 15);

    this.searchText.set('');
    this.results.set([]);
    this.searchSubject.next('');
  }

  private selectLocation(
    location: L.LatLng,
    label?: string
  ): void {
    if (!this.map) {
      return;
    }

    const text = label ??
      `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;

    this.rideRequestResult.set(null);
    this.latestRide.set(null);
    this.rideRequestError.set(null);

    this.stopTracking();

    if (this.selectionMode() === 'pickup') {
      this.pickupMarker?.remove();

      this.pickupMarker = L.circleMarker(location, {
        radius: 9,
        color: 'green',
        fillColor: 'green',
        fillOpacity: 1
      }).addTo(this.map);

      this.pickupCoordinates = location;
      this.pickupText.set(text);
      this.selectionMode.set('drop');
    } else {
      this.dropMarker?.remove();

      this.dropMarker = L.circleMarker(location, {
        radius: 9,
        color: 'red',
        fillColor: 'red',
        fillOpacity: 1
      }).addTo(this.map);

      this.dropCoordinates = location;
      this.dropText.set(text);
    }

    this.calculateFare();
  }

  private calculateFare(): void {
    this.fareSubscription?.unsubscribe();

    this.fare.set(null);
    this.fareError.set(null);
    this.fareLoading.set(false);
    this.rideRequestError.set(null);

    if (
      !this.pickupCoordinates ||
      !this.dropCoordinates
    ) {
      return;
    }

    this.fareLoading.set(true);

    this.fareSubscription = this.fareService.estimateFare({
      pickupLatitude: this.pickupCoordinates.lat,
      pickupLongitude: this.pickupCoordinates.lng,
      dropLatitude: this.dropCoordinates.lat,
      dropLongitude: this.dropCoordinates.lng
    }).subscribe({
      next: response => {
        this.fare.set(response);
        this.fareLoading.set(false);
      },

      error: err => {
        this.fareError.set(
          err.status === 401
            ? 'Please log in again.'
            : err.status === 403
              ? 'You do not have permission to estimate fares.'
              : 'Unable to calculate fare. Please try again.'
        );

        this.fareLoading.set(false);
      }
    });
  }

  onRideTypeChange(value: string): void {
    if (value === 'SOLO' || value === 'SHARED') {
      this.rideType.set(value);
    }
  }

  requestRide(): void {
    if (this.requestingRide()) {
      return;
    }

    if (
      !this.pickupCoordinates ||
      !this.dropCoordinates
    ) {
      this.rideRequestError.set(
        'Please select both pickup and drop locations.'
      );

      return;
    }

    if (this.fareLoading() || !this.fare()) {
      this.rideRequestError.set(
        'Please wait until the fare estimate is available.'
      );

      return;
    }

    if (this.rideRequestResult()) {
      return;
    }

    this.requestingRide.set(true);
    this.rideRequestError.set(null);

    this.rideRequestService.requestRide({
      pickupAddress: this.pickupText(),
      pickupLatitude: this.pickupCoordinates.lat,
      pickupLongitude: this.pickupCoordinates.lng,
      dropAddress: this.dropText(),
      dropLatitude: this.dropCoordinates.lat,
      dropLongitude: this.dropCoordinates.lng,
      rideType: this.rideType()
    }).subscribe({
      next: response => {
        this.rideRequestResult.set(response);
        this.latestRide.set(response.ride);
        this.requestingRide.set(false);

        this.startTracking(response.ride.id);
      },

      error: err => {
        this.requestingRide.set(false);

        this.rideRequestError.set(
          err.status === 401
            ? 'Your session has expired. Please log in again.'
            : err.status === 403
              ? 'Your account is not permitted to request rides.'
              : err.status === 400
                ? 'The ride request was rejected. Check the selected locations and ride type.'
                : 'Unable to request the ride. Please try again.'
        );
      }
    });
  }

  private startRideDetailsRefresh(rideId: number): void {
    this.rideDetailsSubscription?.unsubscribe();

    this.rideDetailsSubscription = interval(5000).pipe(
      startWith(0),

      switchMap(() =>
        this.rideRequestService.getRide(rideId).pipe(
          catchError((error: HttpErrorResponse) => {
            this.rideRequestError.set(
              error.status === 401
                ? 'Your session has expired. Please log in again.'
                : error.status === 403
                  ? 'You are not authorized to view this ride.'
                  : 'Unable to refresh trip details. Retrying...'
            );

            return of(null);
          })
        )
      )
    ).subscribe(ride => {
      if (!ride) {
        return;
      }

      this.latestRide.set(ride);
      this.rideRequestError.set(null);

      if (
        ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(
          ride.status
        )
      ) {
        this.rideDetailsSubscription?.unsubscribe();
        this.rideDetailsSubscription = undefined;
      }
    });
  }

  private startTracking(rideId: number): void {
    this.stopTracking();

    this.latestRide.set(null);
    this.startRideDetailsRefresh(rideId);

    this.trackingRideId.set(rideId);
    this.driverTracking.set(null);
    this.trackingError.set(null);

    this.trackingMessage.set(
      'Waiting for driver assignment...'
    );

    this.trackingStopped.set(false);
    this.trackingLoading.set(true);

    this.trackingSubscription = interval(5000).pipe(
      startWith(0),

      switchMap(() =>
        this.http.get<DriverTrackingResponse>(
          `${environment.apiUrl}/rider/rides/${rideId}/driver-location`
        ).pipe(
          catchError((error: HttpErrorResponse) => {
            this.trackingError.set(
              error.status === 401
                ? 'Your session has expired. Please log in again.'
                : error.status === 403
                  ? 'You are not authorized to track this ride.'
                  : error.status === 404
                    ? 'Ride not found.'
                    : 'Unable to retrieve driver location. Retrying...'
            );

            return of(null);
          })
        )
      )
    ).subscribe(tracking => {
      this.trackingLoading.set(false);

      if (!tracking) {
        return;
      }

      this.trackingError.set(null);
      this.driverTracking.set(tracking);

      if (
        tracking.latitude !== null &&
        tracking.longitude !== null &&
        Number.isFinite(tracking.latitude) &&
        Number.isFinite(tracking.longitude)
      ) {
        this.updateDriverMarker(
          tracking.latitude,
          tracking.longitude
        );

        this.trackingMessage.set(
          'Driver location is updating automatically.'
        );
      } else if (tracking.rideStatus === 'REQUESTED') {
        this.trackingMessage.set(
          'Waiting for a driver to accept your ride.'
        );
      } else if (tracking.rideStatus === 'COMPLETED') {
        this.trackingMessage.set(
          'Your ride is completed.'
        );
      } else if (
        tracking.rideStatus === 'REJECTED' ||
        tracking.rideStatus === 'CANCELLED'
      ) {
        this.trackingMessage.set(
          'This ride is no longer active.'
        );
      } else {
        this.trackingMessage.set(
          'Driver assigned. Waiting for the first location update.'
        );
      }

      if (
        ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(
          tracking.rideStatus
        )
      ) {
        this.trackingStopped.set(true);

        this.trackingSubscription?.unsubscribe();
        this.trackingSubscription = undefined;
      }
    });
  }

  private updateDriverMarker(
    latitude: number,
    longitude: number
  ): void {
    if (!this.map) {
      return;
    }

    const location = L.latLng(latitude, longitude);

    if (!this.driverMarker) {
      this.driverMarker = L.circleMarker(location, {
        radius: 10,
        color: '#1d4ed8',
        fillColor: '#3b82f6',
        fillOpacity: 1,
        weight: 3
      }).addTo(this.map);

      this.driverMarker.bindTooltip('Driver location');
    } else {
      this.driverMarker.setLatLng(location);
    }
  }

  stopTracking(): void {
    this.trackingSubscription?.unsubscribe();
    this.trackingSubscription = undefined;

    this.rideDetailsSubscription?.unsubscribe();
    this.rideDetailsSubscription = undefined;

    this.driverMarker?.remove();
    this.driverMarker = undefined;

    this.trackingRideId.set(null);
    this.driverTracking.set(null);
    this.trackingLoading.set(false);
    this.trackingError.set(null);
    this.trackingMessage.set('');
    this.trackingStopped.set(false);
  }

  prepareAnotherRide(): void {
    this.stopTracking();

    this.rideRequestResult.set(null);
    this.latestRide.set(null);
    this.rideRequestError.set(null);
    this.rideType.set('SOLO');
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
    this.fareSubscription?.unsubscribe();
    this.trackingSubscription?.unsubscribe();
    this.rideDetailsSubscription?.unsubscribe();

    this.searchSubject.complete();
    this.map?.remove();
  }
}