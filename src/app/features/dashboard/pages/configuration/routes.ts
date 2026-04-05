import { Routes } from '@angular/router';

export const DASHBOARD_CONFIGURATION_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'profile'
  },
  {
    path: 'profile',
    loadComponent: () => import('./sections/profile/profile-settings.page').then(m => m.ProfileSettingsPage)
  },
  {
    path: 'security',
    loadComponent: () => import('./sections/security/security-settings.page').then(m => m.SecuritySettingsPage)
  },
  {
    path: 'activity',
    loadComponent: () => import('./sections/activity/activity-settings.page').then(m => m.ActivitySettingsPage)
  }
];
