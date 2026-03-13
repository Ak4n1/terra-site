import { Routes } from '@angular/router';
import { authChildGuard, authGuard } from '../auth/guards/auth.guard';
import { DashboardShellComponent } from './layout/dashboard-shell/dashboard-shell.component';
import { DashboardBuyTerraCoinPage } from './pages/buy-terra-coin/buy-terra-coin.page';
import { DashboardChangePasswordPage } from './pages/change-password/change-password.page';
import { DashboardAdminNotificationsPage } from './pages/admin-notifications/admin-notifications.page';
import { DashboardConfigurationPage } from './pages/configuration/configuration.page';
import { GameAccountsPage } from './pages/game-accounts/game-accounts.page';
import { DashboardHomePage } from './pages/home/home.page';
import { DashboardMyCharactersPage } from './pages/my-characters/my-characters.page';
import { DashboardOfflineMarketPage } from './pages/offline-market/offline-market.page';
import { DashboardSendTerraCoinPage } from './pages/send-terra-coin/send-terra-coin.page';

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
      },
      {
        path: 'my-characters',
        component: DashboardMyCharactersPage
      },
      {
        path: 'change-password',
        component: DashboardChangePasswordPage
      },
      {
        path: 'offline-market',
        component: DashboardOfflineMarketPage
      },
      {
        path: 'buy-terra-coin',
        component: DashboardBuyTerraCoinPage
      },
      {
        path: 'send-terra-coin',
        component: DashboardSendTerraCoinPage
      },
      {
        path: 'configuration',
        component: DashboardConfigurationPage
      },
      {
        path: 'admin-notifications',
        component: DashboardAdminNotificationsPage
      }
    ]
  }
];
