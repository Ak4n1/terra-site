import { Routes } from '@angular/router';
import { authChildGuard, authGuard } from '../auth/guards/auth.guard';
import { DashboardShellComponent } from './layout/dashboard-shell/dashboard-shell.component';
import { GameAccountsPage } from './pages/game-accounts/game-accounts.page';
import { DashboardHomePage } from './pages/home/home.page';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    component: DashboardShellComponent,
    children: [
      {
        path: '',
        component: DashboardHomePage,
        data: { titleKey: 'dashboardTitleHome' }
      },
      {
        path: 'game-accounts',
        component: GameAccountsPage,
        data: { titleKey: 'dashboardTitleGameAccounts' }
      }
    ]
  }
];
