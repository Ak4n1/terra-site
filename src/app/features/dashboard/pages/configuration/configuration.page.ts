import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { LanguageService } from '../../../../core/i18n/language.service';
import { MaskButtonComponent } from '../../../../shared/ui/atoms/mask-button/mask-button.component';
import { NotificationsSettingsCacheService } from './sections/notifications/notifications-settings-cache.service';
import { CONFIGURATION_TABS, type ConfigurationTab, type ConfigurationTabKey } from './configuration-tabs.config';

@Component({
  selector: 'app-dashboard-configuration-page',
  standalone: true,
  imports: [CommonModule, MaskButtonComponent, RouterOutlet],
  templateUrl: './configuration.page.html',
  styleUrl: './configuration.page.css'
})
export class DashboardConfigurationPage implements OnInit {
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly notificationsSettingsCache = inject(NotificationsSettingsCacheService);

  readonly tabs: ReadonlyArray<ConfigurationTab> = CONFIGURATION_TABS;

  ngOnInit(): void {
    this.notificationsSettingsCache.prefetchDefault();
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  isTabActive(route: string): boolean {
    return this.router.isActive(route, {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored'
    });
  }

  trackByTabKey(_: number, tab: ConfigurationTab): ConfigurationTabKey {
    return tab.key;
  }
}
