import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { Globe, LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';
import { LanguageService } from '../../../../core/i18n/language.service';
import type { AppLanguage } from '../../../../core/i18n/types';
import { CurrentDateComponent } from '../../atoms/current-date/current-date.component';
import { LanguageFlagTriggerComponent } from '../../atoms/language-flag-trigger/language-flag-trigger.component';
import { MenuToggleComponent } from '../../atoms/menu-toggle/menu-toggle.component';
import { NavLinkComponent } from '../../atoms/nav-link/nav-link.component';
import { NotificationsDropdownComponent } from '../../molecules/notifications-dropdown/notifications-dropdown.component';
import { AuthFacadeService } from '../../../../features/auth/services/auth-facade.service';

type LanguageOption = {
  code: AppLanguage;
  label: string;
  flag: string;
};

@Component({
  selector: 'ui-dashboard-topbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CurrentDateComponent, LanguageFlagTriggerComponent, MenuToggleComponent, NavLinkComponent, NotificationsDropdownComponent],
  templateUrl: './dashboard-topbar.component.html',
  styleUrl: './dashboard-topbar.component.css'
})
export class DashboardTopbarComponent {
  @Input() mobileSidebarOpen = false;
  @Output() readonly menuToggleRequested = new EventEmitter<void>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  readonly languageService = inject(LanguageService);
  private readonly authFacade = inject(AuthFacadeService);
  readonly globeIcon = Globe;

  isLanguageMenuOpen = false;

  readonly languageOptions: LanguageOption[] = [
    { code: 'us', label: 'languageEnglish', flag: 'assets/flags/us.webp' },
    { code: 'es', label: 'languageSpanish', flag: 'assets/flags/spain.webp' },
    { code: 'pt', label: 'languagePortuguese', flag: 'assets/flags/portugal.webp' },
    { code: 'fr', label: 'languageFrench', flag: 'assets/flags/france.webp' },
    { code: 'de', label: 'languageGerman', flag: 'assets/flags/germany.webp' }
  ];

  get currentLanguage(): AppLanguage {
    return this.languageService.language();
  }

  get selectedLanguage(): LanguageOption {
    return this.languageOptions.find(option => option.code === this.currentLanguage) ?? this.languageOptions[0];
  }

  get selectedLanguageLabel(): string {
    return this.t(this.selectedLanguage.label);
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  toggleLanguageMenu(): void {
    this.isLanguageMenuOpen = !this.isLanguageMenuOpen;
  }

  requestMenuToggle(): void {
    this.menuToggleRequested.emit();
  }

  goToSite(): void {
    void this.router.navigateByUrl('/');
  }

  selectLanguage(code: AppLanguage): void {
    this.authFacade.updatePreferredLanguage(code).subscribe();
    this.isLanguageMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isLanguageMenuOpen) {
      return;
    }

    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.isLanguageMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.isLanguageMenuOpen = false;
  }
}
