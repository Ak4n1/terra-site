import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';

@Component({
  selector: 'app-dashboard-home-page',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class DashboardHomePage {
  readonly accountEmail = 'email@email.com';
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);

  t(key: string): string {
    return this.languageService.t(key);
  }

  openGameAccounts(): void {
    void this.router.navigateByUrl('/dashboard/game-accounts');
  }
}
