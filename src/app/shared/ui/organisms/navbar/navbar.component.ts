import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, OnDestroy, Output, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import type { AppLanguage } from '../../../../core/i18n/types';
import { AuthFacadeService } from '../../../../features/auth/services/auth-facade.service';
import { SessionAvatarService } from '../../../../features/auth/services/session-avatar.service';
import { NotificationsDropdownComponent } from '../../molecules/notifications-dropdown/notifications-dropdown.component';
import { LanguageFlagTriggerComponent } from '../../atoms/language-flag-trigger/language-flag-trigger.component';
import { MenuToggleComponent } from '../../atoms/menu-toggle/menu-toggle.component';
import { NavLinkComponent } from '../../atoms/nav-link/nav-link.component';
import { SocialIconComponent } from '../../atoms/social-icon/social-icon.component';

type MenuNode = {
  labelKey: string;
  href: string;
  drop?: boolean;
  children?: MenuNode[];
};

type SocialItem = {
  href: string;
  title: string;
  iconClass: string;
};

type LanguageOption = {
  code: AppLanguage;
  label: string;
  flag: string;
};

@Component({
  selector: 'ui-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NavLinkComponent,
    SocialIconComponent,
    LanguageFlagTriggerComponent,
    MenuToggleComponent,
    NotificationsDropdownComponent
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly sessionAvatarService = inject(SessionAvatarService);
  readonly languageService = inject(LanguageService);
  @Output() readonly authRequested = new EventEmitter<'login' | 'register'>();

  private readonly currentUser = toSignal(this.authFacade.currentUser$, { initialValue: null });
  private readonly isAuthenticated = toSignal(this.authFacade.isAuthenticated$, { initialValue: false });
  private readonly authState = toSignal(this.authFacade.authState$, { initialValue: 'checking' });

  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  openDropdownLabel: string | null = null;
  isLanguageMenuOpen = false;
  isMobileMenuOpen = false;
  isAccountMenuOpen = false;
  mobileActiveParent: MenuNode | null = null;
  readonly sessionAvatar = signal<string | null>(null);
  readonly sessionEmail = computed(() => this.currentUser()?.email ?? '');
  readonly loggedIn = computed(() => this.isAuthenticated());
  readonly authPending = computed(() => {
    const state = this.authState();
    return state === 'checking' || state === 'rate-limited';
  });

  readonly navItems: MenuNode[] = [
    { labelKey: 'navHome', href: '/' },
    {
      labelKey: 'navDownloads',
      href: '#',
      drop: true,
      children: [
        { labelKey: 'downloadRequirements', href: '#', drop: true },
        { labelKey: 'downloadClient', href: '#', drop: true },
        { labelKey: 'downloadLauncher', href: '#', drop: true }
      ]
    },
    {
      labelKey: 'navStatistics',
      href: '#',
      drop: true,
      children: [
        {
          labelKey: 'statRates',
          href: '#',
          drop: true,
          children: [
            { labelKey: 'statRatesXpSp', href: '#' },
            { labelKey: 'statRatesAdena', href: '#' },
            { labelKey: 'statRatesDropSpoil', href: '#' },
            { labelKey: 'statCharacter', href: '#' }
          ]
        },
        {
          labelKey: 'statEnchanting',
          href: '#',
          drop: true,
          children: [
            { labelKey: 'statEnchantWeapon', href: '#' },
            { labelKey: 'statEnchantArmor', href: '#' },
            { labelKey: 'statBrooch', href: '#' },
            { labelKey: 'statJewels', href: '#' },
            { labelKey: 'statTalisman', href: '#' },
            { labelKey: 'statRunes', href: '#' }
          ]
        },
        {
          labelKey: 'statAugmentation',
          href: '#',
          drop: true
        },
        {
          labelKey: 'statRanking',
          href: '#',
          drop: true,
          children: [
            { labelKey: 'statRankingPvp', href: '#' },
            { labelKey: 'statRankingPk', href: '#' },
            { labelKey: 'statRankingInfo', href: '#' }
          ]
        },
        { labelKey: 'statOlympiad', href: '#' }
      ]
    },
    {
      labelKey: 'navServices',
      href: '#',
      drop: true,
      children: [
        { labelKey: 'serviceRenameGender', href: '#', drop: true },
        { labelKey: 'serviceNameTitleColors', href: '#', drop: true },
        { labelKey: 'serviceClassChange', href: '#', drop: true },
        { labelKey: 'serviceInventory', href: '#', drop: true },
        { labelKey: 'serviceWarehouse', href: '#', drop: true },
        { labelKey: 'serviceDelevel', href: '#', drop: true },
        { labelKey: 'serviceDropsearch', href: '#', drop: true }
      ]
    },
    {
      labelKey: 'navMedia',
      href: '#',
      drop: true,
      children: [
        { labelKey: 'mediaScreenshots', href: '#' },
        { labelKey: 'mediaVideos', href: '#' },
        { labelKey: 'mediaWallpapers', href: '#' }
      ]
    },
    {
      labelKey: 'navNews',
      href: '#',
      drop: true,
      children: [
        { labelKey: 'newsLatest', href: '#' },
        { labelKey: 'newsPatch', href: '#' },
        { labelKey: 'newsEvents', href: '#' }
      ]
    }
  ];

  readonly socials: SocialItem[] = [
    { href: 'https://www.instagram.com/l2terra/', title: 'Instagram', iconClass: 'fa-brands fa-instagram' },
    { href: 'https://www.facebook.com/profile.php?id=61567708986480', title: 'Facebook', iconClass: 'fa-brands fa-facebook-f' },
    { href: 'https://discord.gg/wXnPMdStvW', title: 'Discord', iconClass: 'fa-brands fa-discord' },
    { href: 'https://www.youtube.com/@L2Terra', title: 'YouTube', iconClass: 'fa-brands fa-youtube' }
  ];

  readonly languageOptions: LanguageOption[] = [
    { code: 'us', label: 'languageEnglish', flag: 'assets/flags/us.webp' },
    { code: 'es', label: 'languageSpanish', flag: 'assets/flags/spain.webp' },
    { code: 'pt', label: 'languagePortuguese', flag: 'assets/flags/portugal.webp' },
    { code: 'fr', label: 'languageFrench', flag: 'assets/flags/france.webp' },
    { code: 'de', label: 'languageGerman', flag: 'assets/flags/germany.webp' }
  ];

  constructor() {
    effect(() => {
      const email = this.sessionEmail();
      if (!email) {
        this.sessionAvatar.set(this.sessionAvatarService.resolve(null));
        this.isAccountMenuOpen = false;
        return;
      }

      this.sessionAvatar.set(this.sessionAvatarService.resolve(email));
    });
  }

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
    if (this.isLanguageMenuOpen) {
      this.isAccountMenuOpen = false;
    }
  }

  selectLanguage(code: AppLanguage): void {
    this.languageService.setLanguage(code);
    this.isLanguageMenuOpen = false;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.syncBodyScroll();
    if (!this.isMobileMenuOpen) {
      this.mobileActiveParent = null;
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    this.mobileActiveParent = null;
    this.syncBodyScroll();
  }

  openMobileSubmenu(item: MenuNode): void {
    if (!item.children?.length) {
      return;
    }
    this.mobileActiveParent = item;
  }

  closeMobileSubmenu(): void {
    this.mobileActiveParent = null;
  }

  openDropdown(item: MenuNode): void {
    if (!item.drop) {
      return;
    }
    this.cancelCloseTimer();
    this.openDropdownLabel = item.labelKey;
  }

  scheduleClose(item: MenuNode, delayMs = 200): void {
    if (!item.drop) {
      return;
    }
    this.cancelCloseTimer();
    this.closeTimer = setTimeout(() => {
      if (this.openDropdownLabel === item.labelKey) {
        this.openDropdownLabel = null;
      }
      this.closeTimer = null;
    }, delayMs);
  }

  scheduleCloseAll(delayMs = 400): void {
    this.cancelCloseTimer();
    this.closeTimer = setTimeout(() => {
      this.openDropdownLabel = null;
      this.closeTimer = null;
    }, delayMs);
  }

  cancelCloseTimer(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  isDropdownOpen(item: MenuNode): boolean {
    return this.openDropdownLabel === item.labelKey;
  }

  requestAuth(mode: 'login' | 'register', event?: Event): void {
    event?.preventDefault();
    this.authRequested.emit(mode);
    this.closeMobileMenu();
  }

  toggleAccountMenu(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.isAccountMenuOpen = !this.isAccountMenuOpen;
    if (this.isAccountMenuOpen) {
      this.isLanguageMenuOpen = false;
    }
  }

  async goToPanel(event?: Event): Promise<void> {
    event?.preventDefault();
    this.isAccountMenuOpen = false;
    this.closeMobileMenu();
    await this.router.navigateByUrl('/dashboard');
  }

  async goToConfiguration(event?: Event): Promise<void> {
    event?.preventDefault();
    this.isAccountMenuOpen = false;
    this.closeMobileMenu();
    await this.router.navigateByUrl('/dashboard/configuration');
  }

  async logout(event?: Event): Promise<void> {
    event?.preventDefault();
    this.isAccountMenuOpen = false;
    this.closeMobileMenu();

    try {
      await firstValueFrom(this.authFacade.logout());
    } finally {
      await this.router.navigateByUrl('/');
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.isLanguageMenuOpen = false;
      this.isAccountMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.isLanguageMenuOpen = false;
    this.isAccountMenuOpen = false;
    this.closeMobileMenu();
  }

  ngOnDestroy(): void {
    this.cancelCloseTimer();
    this.resetBodyScroll();
  }

  private syncBodyScroll(): void {
    const body = this.document?.body;
    if (!body) {
      return;
    }

    body.style.overflow = this.isMobileMenuOpen ? 'hidden' : '';
  }

  private resetBodyScroll(): void {
    const body = this.document?.body;
    if (body) {
      body.style.overflow = '';
    }
  }
}
