import { Routes } from '@angular/router';

import { Login } from './core/auth/login/login';
import { Register } from './core/auth/register/register';
import { authGuard, roleGuard } from './core/auth/auth.guard';

import { RiderDashboard } from './rider/rider-dashboard';
import { DriverDashboard } from './driver/dashboard/driver-dashboard';
import { Registration } from './driver/registration/registration';
import { AdminDashboard } from './admin/admin-dashboard/admin-dashboard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },

  // Public routes
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'register',
    component: Register,
  },

  // Rider dashboard
  {
    path: 'rider',
    component: RiderDashboard,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['RIDER'] },
  },

  // Driver dashboard
  {
    path: 'driver',
    component: DriverDashboard,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['DRIVER'] },
  },

  // Driver registration
  {
    path: 'driver/register',
    component: Registration,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['DRIVER'] },
  },

  // Admin dashboard (placeholder for now)
  {
    path: 'admin',
    component: AdminDashboard,
    canActivate: [authGuard, roleGuard],
    data: { title: 'Admin', roles: ['ADMIN'] },
  },

  // Invalid routes
  {
    path: '**',
    redirectTo: 'login',
  },
];
