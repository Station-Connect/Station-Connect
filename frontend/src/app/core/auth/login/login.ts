import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="page">
      <mat-card class="card">
        <mat-card-header>
          <mat-card-title>Station Connect</mat-card-title>
          <mat-card-subtitle>Log in to your account</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (registered) {
            <p class="ok">Registered successfully. Please log in.</p>
          }
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
              <mat-error>Enter a valid email</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="current-password" />
              <mat-error>Password is required</mat-error>
            </mat-form-field>
            @if (error()) {
              <p class="error">{{ error() }}</p>
            }
            <button mat-flat-button type="submit" [disabled]="loading()">
              {{ loading() ? 'Logging in...' : 'Log in' }}
            </button>
          </form>
        </mat-card-content>
        <mat-card-actions>
          <a mat-button routerLink="/register">Create an account</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: `
    .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .card { width: 100%; max-width: 400px; padding: 16px; }
    form { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
    .error { color: #b3261e; margin: 0; }
    .ok { color: #1b6e2e; margin: 8px 0 0; }
  `,
})
export class Login {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly registered = inject(ActivatedRoute).snapshot.queryParamMap.get('registered') === 'true';
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res) => this.router.navigateByUrl(this.auth.homeFor(res.role)),
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? 'Cannot reach the server');
        this.loading.set(false);
      },
    });
  }
}