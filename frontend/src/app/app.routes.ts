import { Routes } from '@angular/router';

import { Login } from './core/auth/login/login';
import { Register } from './core/auth/register/register';
import { Placeholder } from './shared/placeholder/placeholder';
import { RiderDashboard } from './rider/rider-dashboard';

// Authentication Guard
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [

  // Default Route
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },

  // Public Routes
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },

  // Protected Rider Dashboard
  {
    path: 'rider',
    component: RiderDashboard,
    canActivate: [authGuard]
  },

  // Protected Driver Dashboard
  {
    path: 'driver',
    component: Placeholder,
    canActivate: [authGuard],
    data: { title: 'Driver' }
  },

  // Protected Admin Dashboard
  {
    path: 'admin',
    component: Placeholder,
    canActivate: [authGuard],
    data: { title: 'Admin' }
  },

  // Invalid Routes
  {
    path: '**',
    redirectTo: 'login'
  }

];