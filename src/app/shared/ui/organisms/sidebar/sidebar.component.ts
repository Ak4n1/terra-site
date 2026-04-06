import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AuthFacadeService } from '../../../../features/auth/services/auth-facade.service';
import { SessionAvatarService } from '../../../../features/auth/services/session-avatar.service';
import { MaskButtonComponent } from '../../atoms/mask-button/mask-button.component';
import { MenuToggleComponent } from '../../atoms/menu-toggle/menu-toggle.component';
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
  imports: [CommonModule, NavLinkComponent, MaskButtonComponent, MenuToggleComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnDestroy {
  @Input() mobileOpen = false;
  @Output() readonly closeRequested = new EventEmitter<void>();

  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly sessionAvatarService = inject(SessionAvatarService);
  readonly currentUser = toSignal(this.authFacade.currentUser$, { initialValue: null });
  readonly sessionAvatar = computed(() => {
    this.sessionAvatarService.avatarRevision();
    return this.sessionAvatarService.resolveFromUser(this.currentUser());
  });
  readonly sidebarMode = signal<'account' | 'privileged'>('account');
  readonly sidebarModeSwitching = signal(false);
  private static readonly MODE_TEXT_HIDE_BEFORE_SWITCH_MS = 90;
  private static readonly MODE_SPIN_DURATION_MS = 1000;
  private modeSwitchTimer: ReturnType<typeof setTimeout> | null = null;
  private modeSwitchStartTimer: ReturnType<typeof setTimeout> | null = null;
  private modeInitialized = false;

  readonly canUsePrivilegedMode = computed(() => {
    const roles = this.currentUser()?.roles ?? [];
    return roles.includes('MODERATOR') || roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
  });
  readonly highestRole = computed(() => {
    const roles = this.currentUser()?.roles ?? [];
    const roleRank: Record<string, number> = {
      USER: 1,
      MODERATOR: 2,
      ADMIN: 3,
      SUPER_ADMIN: 4
    };

    if (!roles.length) {
      return 'USER';
    }

    return roles
      .slice()
      .sort((left, right) => (roleRank[right] ?? 0) - (roleRank[left] ?? 0))[0] ?? 'USER';
  });
  readonly sidebarModeCopy = computed(() => (this.sidebarMode() === 'account' ? 'USER' : this.highestRole()));

  readonly sections = computed<SidebarSection[]>(() => {
    const accountSections: SidebarSection[] = [
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

    const privilegedSections: SidebarSection[] = [];
    if (this.canUsePrivilegedMode()) {
      privilegedSections.push({
        titleKey: 'dashboardSidebarSectionAdmin',
        items: [
          { labelKey: 'dashboardSidebarAdminNotifications', route: '/dashboard/admin-notifications' }
        ]
      });
    }

    const wantsPrivileged = this.sidebarMode() === 'privileged' && this.canUsePrivilegedMode();
    return wantsPrivileged ? privilegedSections : accountSections;
  });

  readonly footerItem: SidebarItem = {
    labelKey: 'dashboardSidebarConfiguration',
    route: '/dashboard/configuration'
  };

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (!user || this.modeInitialized) {
        return;
      }

      this.sidebarMode.set('account');
      this.modeInitialized = true;
    });
  }

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

  setSidebarMode(mode: 'account' | 'privileged'): void {
    const nextMode = mode === 'privileged' && !this.canUsePrivilegedMode() ? 'account' : mode;
    if (nextMode === this.sidebarMode()) {
      return;
    }

    this.sidebarModeSwitching.set(false);
    if (this.modeSwitchStartTimer) {
      clearTimeout(this.modeSwitchStartTimer);
    }
    if (this.modeSwitchTimer) {
      clearTimeout(this.modeSwitchTimer);
    }

    this.modeSwitchStartTimer = setTimeout(() => {
      this.sidebarMode.set(nextMode);
      this.sidebarModeSwitching.set(true);
      this.modeSwitchStartTimer = null;

      this.modeSwitchTimer = setTimeout(() => {
        this.sidebarModeSwitching.set(false);
        this.modeSwitchTimer = null;
      }, SidebarComponent.MODE_SPIN_DURATION_MS);
    }, SidebarComponent.MODE_TEXT_HIDE_BEFORE_SWITCH_MS);
  }

  isMode(mode: 'account' | 'privileged'): boolean {
    return this.sidebarMode() === mode;
  }

  ngOnDestroy(): void {
    if (this.modeSwitchStartTimer) {
      clearTimeout(this.modeSwitchStartTimer);
      this.modeSwitchStartTimer = null;
    }

    if (this.modeSwitchTimer) {
      clearTimeout(this.modeSwitchTimer);
      this.modeSwitchTimer = null;
    }
  }
}
