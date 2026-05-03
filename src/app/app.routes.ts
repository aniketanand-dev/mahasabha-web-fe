import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'scholarships/apply',
    loadComponent: () => import('./pages/scholarship-application/scholarship-application.component').then(m => m.ScholarshipApplicationComponent)
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./pages/admin-login/admin-login.component').then(m => m.AdminLoginComponent)
  },
  {
    path: 'admin/forgot-password',
    loadComponent: () => import('./pages/admin-forgot-password/admin-forgot-password.component').then(m => m.AdminForgotPasswordComponent)
  },
  {
    path: 'admin/reset-password',
    loadComponent: () => import('./pages/admin-reset-password/admin-reset-password.component').then(m => m.AdminResetPasswordComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '' }
];
