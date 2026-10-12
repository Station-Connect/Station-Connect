import { Routes } from '@angular/router';
import { Login } from './core/auth/login/login';
import { Register } from './core/auth/register/register';
import { Placeholder } from './shared/placeholder/placeholder';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'rider', component: Placeholder, data: { title: 'Rider' } },
  { path: 'driver', component: Placeholder, data: { title: 'Driver' } },
  { path: 'admin', component: Placeholder, data: { title: 'Admin' } },
  { path: '**', redirectTo: 'login' },
];