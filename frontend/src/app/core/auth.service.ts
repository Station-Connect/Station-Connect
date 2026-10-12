import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiResponse, LoginRequest, LoginResponse, RegisterRequest, Role, UserResponse,
} from '../shared/model/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiUrl}/auth`;

  readonly token = signal<string | null>(localStorage.getItem('token'));
  readonly role = signal<Role | null>(localStorage.getItem('role') as Role | null);
  readonly name = signal<string | null>(localStorage.getItem('name'));
  readonly isLoggedIn = computed(() => !!this.token());

  register(req: RegisterRequest): Observable<UserResponse> {
    return this.http
      .post<ApiResponse<UserResponse>>(`${this.base}/register`, req)
      .pipe(map((r) => r.data));
  }

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.base}/login`, req).pipe(
      map((r) => r.data),
      tap((d) => {
        localStorage.setItem('token', d.token);
        localStorage.setItem('role', d.role);
        localStorage.setItem('name', d.name);
        this.token.set(d.token);
        this.role.set(d.role);
        this.name.set(d.name);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    this.token.set(null);
    this.role.set(null);
    this.name.set(null);
    this.router.navigate(['/login']);
  }

  homeFor(role: Role): string {
    return role === 'ADMIN' ? '/admin' : role === 'DRIVER' ? '/driver' : '/rider';
  }
}