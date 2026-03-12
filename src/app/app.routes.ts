import { Routes } from '@angular/router';
import { authMatchGuard } from './features/auth/guards/auth.guard';
import { HomePage } from './features/public/pages/home/home.page';
import { ResetPasswordPage } from './features/auth/pages/reset-password/reset-password.page';
import { VerifyEmailPage } from './features/auth/pages/verify-email/verify-email.page';
import { TestPage } from './features/dev/pages/test/test.page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'verify-email', component: VerifyEmailPage },
  { path: 'reset-password', component: ResetPasswordPage },
  { path: 'dashboard', canMatch: [authMatchGuard], loadChildren: () => import('./features/dashboard/routes').then(m => m.DASHBOARD_ROUTES) },
  { path: 'test', component: TestPage },
  { path: '**', redirectTo: '' }
];
