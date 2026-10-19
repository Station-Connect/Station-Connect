
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LocationResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationSearchService {
  private readonly http = inject(HttpClient);

  private readonly searchUrl =
    'https://nominatim.openstreetmap.org/search';

  search(query: string): Observable<LocationResult[]> {
    const params = new HttpParams()
      .set('q', query)
      .set('format', 'json')
      .set('limit', '5')
      .set('countrycodes', 'in');

    return this.http.get<LocationResult[]>(
      this.searchUrl,
      { params }
    );
  }
}
