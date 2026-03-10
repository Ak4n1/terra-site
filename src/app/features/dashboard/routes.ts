import { Routes } from '@angular/router';
import { DashboardShellComponent } from './layout/dashboard-shell/dashboard-shell.component';
import { GameAccountsPage } from './pages/game-accounts/game-accounts.page';
import { DashboardHomePage } from './pages/home/home.page';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
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
