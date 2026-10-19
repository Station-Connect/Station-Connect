
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
import * as L from 'leaflet';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  filter,
  catchError,
  of,
  Subscription
} from 'rxjs';

import {
  LocationSearchService,
  LocationResult
} from './location-search.service';

type LocationMode = 'pickup' | 'drop';

@Component({
  selector: 'app-rider-map',
  standalone: true,
  imports: [FormsModule],
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

      <div #mapContainer class="map"></div>

      <div class="locations">
        <p><strong>Pickup:</strong> {{ pickupText() }}</p>
        <p><strong>Drop:</strong> {{ dropText() }}</p>
      </div>
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

    .controls button {
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

    .error {
      color: #c62828;
    }
  `]
})
export class RiderMap implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer')
  mapContainer!: ElementRef<HTMLDivElement>;

  private readonly locationService = inject(LocationSearchService);
  private readonly searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  private map?: L.Map;
  private pickupMarker?: L.CircleMarker;
  private dropMarker?: L.CircleMarker;

  readonly selectionMode = signal<LocationMode>('pickup');
  readonly pickupText = signal('Not selected');
  readonly dropText = signal('Not selected');

  readonly searchText = signal('');
  readonly results = signal<LocationResult[]>([]);
  readonly searching = signal(false);
  readonly searchError = signal<string | null>(null);

  constructor() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(1100),
      distinctUntilChanged(),
      filter(query => query.trim().length >= 3),
      switchMap(query => {
        this.searching.set(true);
        this.searchError.set(null);

        return this.locationService.search(query).pipe(
          catchError(() => {
            this.searchError.set('Unable to search locations.');
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

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.selectLocation(event.latlng);
    });
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

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const location = L.latLng(latitude, longitude);

    this.selectLocation(location, result.display_name);

    this.map?.setView(location, 15);

    this.searchText.set('');
    this.results.set([]);
  }

  private selectLocation(
    location: L.LatLng,
    label?: string
  ): void {
    if (!this.map) return;

    const text = label ??
      `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;

    if (this.selectionMode() === 'pickup') {
      this.pickupMarker?.remove();

      this.pickupMarker = L.circleMarker(location, {
        radius: 9,
        color: 'green',
        fillColor: 'green',
        fillOpacity: 1
      }).addTo(this.map);

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

      this.dropText.set(text);
    }
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
    this.searchSubject.complete();
    this.map?.remove();
  }
}
