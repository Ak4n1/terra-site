import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../../core/i18n/language.service';
import type { AppLanguage } from '../../../../core/i18n/types';
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
  imports: [CommonModule, RouterLink, NavLinkComponent, SocialIconComponent, LanguageFlagTriggerComponent, MenuToggleComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly languageService = inject(LanguageService);

  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  openDropdownLabel: string | null = null;
  isLanguageMenuOpen = false;
  isMobileMenuOpen = false;
  mobileActiveParent: MenuNode | null = null;

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

  selectLanguage(code: AppLanguage): void {
    this.languageService.setLanguage(code);
    this.isLanguageMenuOpen = false;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (!this.isMobileMenuOpen) {
      this.mobileActiveParent = null;
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    this.mobileActiveParent = null;
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
    this.closeMobileMenu();
  }

  ngOnDestroy(): void {
    this.cancelCloseTimer();
  }
}
