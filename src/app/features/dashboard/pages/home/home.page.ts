import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AuthFacadeService } from '../../../auth/services/auth-facade.service';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';

@Component({
  selector: 'app-dashboard-home-page',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class DashboardHomePage {
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly authFacade = inject(AuthFacadeService);
  readonly currentUser = toSignal(this.authFacade.currentUser$, { initialValue: null });

  t(key: string): string {
    return this.languageService.t(key);
  }

  accountEmail(): string {
    return this.currentUser()?.email ?? '-';
  }

  openGameAccounts(): void {
    void this.router.navigateByUrl('/dashboard/game-accounts');
  }
}
