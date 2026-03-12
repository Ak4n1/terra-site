import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AuthFacadeService } from '../../../../features/auth/services/auth-facade.service';
import { SessionAvatarService } from '../../../../features/auth/services/session-avatar.service';
import { ButtonComponent } from '../../atoms/button/button.component';
import { NavLinkComponent } from '../../atoms/nav-link/nav-link.component';

type SidebarItem = {
  labelKey: string;
  route: string;
};

type SidebarSection = {
  titleKey: string;
  items: SidebarItem[];
};

@Component({
  selector: 'ui-sidebar',
  standalone: true,
  imports: [CommonModule, NavLinkComponent, ButtonComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  @Input() mobileOpen = false;
  @Output() readonly closeRequested = new EventEmitter<void>();

  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly sessionAvatarService = inject(SessionAvatarService);
  readonly currentUser = toSignal(this.authFacade.currentUser$, { initialValue: null });
  readonly sessionAvatar = computed(() => this.sessionAvatarService.resolve(this.currentUser()?.email));

  readonly sections: SidebarSection[] = [
    {
      titleKey: 'dashboardSidebarSectionAccount',
      items: [
        { labelKey: 'dashboardSidebarOverview', route: '/dashboard' },
        { labelKey: 'dashboardSidebarMyCharacters', route: '/dashboard/my-characters' },
        { labelKey: 'dashboardSidebarCreateAccount', route: '/dashboard/game-accounts' },
        { labelKey: 'dashboardSidebarChangePassword', route: '/dashboard/change-password' }
      ]
    },
    {
      titleKey: 'dashboardSidebarSectionMarket',
      items: [
        { labelKey: 'dashboardSidebarOfflineMarket', route: '/dashboard/offline-market' },
        { labelKey: 'dashboardSidebarBuyTerraCoin', route: '/dashboard/buy-terra-coin' },
        { labelKey: 'dashboardSidebarSendTerraCoin', route: '/dashboard/send-terra-coin' }
      ]
    }
  ];

  readonly footerItem: SidebarItem = {
    labelKey: 'dashboardSidebarConfiguration',
    route: '/dashboard/configuration'
  };

  t(key: string): string {
    return this.languageService.t(key);
  }

  accountEmail(): string {
    return this.currentUser()?.email ?? '-';
  }

  isActive(route: string): boolean {
    return route === '/dashboard' ? this.router.url === route : this.router.url.startsWith(route);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.authFacade.logout());
    } finally {
      await this.router.navigateByUrl('/');
    }
  }

  closeMobileSidebar(): void {
    this.closeRequested.emit();
  }
}
