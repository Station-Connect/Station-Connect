import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-placeholder',
  imports: [MatButtonModule],
  template: `
    <div class="box">
      <h2>{{ title }} dashboard</h2>
      <p>Hello {{ auth.name() }}. The real screens arrive on Day 3.</p>
      <button mat-stroked-button (click)="auth.logout()">Log out</button>
    </div>
  `,
  styles: `
    .box { max-width: 480px; margin: 80px auto; padding: 16px; text-align: center; }
  `,
})
export class Placeholder {
  protected readonly auth = inject(AuthService);
  protected readonly title = inject(ActivatedRoute).snapshot.data['title'];
}