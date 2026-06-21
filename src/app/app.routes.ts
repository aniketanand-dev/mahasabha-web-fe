import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'organisation/office-bearers',
    loadComponent: () => import('./pages/office-bearers/office-bearers.component').then(m => m.OfficeBearersComponent)
  },
  {
    path: 'organisation/working-committee',
    loadComponent: () => import('./pages/working-committee/working-committee.component').then(m => m.WorkingCommitteeComponent)
  },
  {
    path: 'organisation/representative-general-body',
    loadComponent: () => import('./pages/representative-general-body/representative-general-body.component').then(m => m.RepresentativeGeneralBodyComponent)
  },
  {
    path: 'organisation/state-committee',
    loadComponent: () => import('./pages/state-committee/state-committee.component').then(m => m.StateCommitteeComponent)
  },
  {
    path: 'organisation/nominated-body',
    loadComponent: () => import('./pages/nominated-body/nominated-body.component').then(m => m.NominatedBodyComponent)
  },
  {
    path: 'organisation/node/:nodeId/members',
    loadComponent: () => import('./pages/org-node-members/org-node-members.component').then(m => m.OrgNodeMembersComponent)
  },
  {
    path: 'organisation/node/:nodeId',
    loadComponent: () => import('./pages/org-node-detail/org-node-detail.component').then(m => m.OrgNodeDetailComponent)
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
