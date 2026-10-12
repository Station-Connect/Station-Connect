import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  template: `
    <div class="page">
      <mat-card class="card">
        <mat-card-header>
          <mat-card-title>Station Connect</mat-card-title>
          <mat-card-subtitle>Create your account</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>Full name</mat-label>
              <input matInput formControlName="fullName" autocomplete="name" />
              <mat-error>Full name is required</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
              <mat-error>Enter a valid email</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Phone</mat-label>
              <input matInput formControlName="phone" autocomplete="tel" />
              <mat-error>Enter a 10 digit phone number</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password" />
              <mat-error>At least 8 characters</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>I am a</mat-label>
              <mat-select formControlName="role">
                <mat-option value="RIDER">Rider</mat-option>
                <mat-option value="DRIVER">Driver</mat-option>
              </mat-select>
            </mat-form-field>
            @if (error()) {
              <p class="error">{{ error() }}</p>
            }
            <button mat-flat-button type="submit" [disabled]="loading()">
              {{ loading() ? 'Creating...' : 'Create account' }}
            </button>
          </form>
        </mat-card-content>
        <mat-card-actions>
          <a mat-button routerLink="/login">I already have an account</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: `
    .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .card { width: 100%; max-width: 400px; padding: 16px; }
    form { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
    .error { color: #b3261e; margin: 0; }
  `,
})
export class Register {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: this.fb.control<'RIDER' | 'DRIVER'>('RIDER'),
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/login'], { queryParams: { registered: 'true' } }),
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? 'Cannot reach the server');
        this.loading.set(false);
      },
    });
  }
}