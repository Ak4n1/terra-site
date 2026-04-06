import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { LanguageService } from '../../../../core/i18n/language.service';
import {
  MaskButtonComponent,
  type MaskButtonMask
} from '../../../../shared/ui/atoms/mask-button/mask-button.component';
import { NotificationsSettingsCacheService } from './sections/notifications/notifications-settings-cache.service';

type ConfigurationTab = {
  key: 'profile' | 'security' | 'activity' | 'notifications';
  route: string;
  labelKey: string;
  mask: MaskButtonMask;
};

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

  readonly tabs: ConfigurationTab[] = [
    {
      key: 'profile',
      route: '/dashboard/configuration/profile',
      labelKey: 'dashboardConfigurationTabProfile',
      mask: 5
    },
    {
      key: 'security',
      route: '/dashboard/configuration/security',
      labelKey: 'dashboardConfigurationTabSecurity',
      mask: 3
    },
    {
      key: 'notifications',
      route: '/dashboard/configuration/notifications',
      labelKey: 'dashboardConfigurationTabNotifications',
      mask: 4
    },
    {
      key: 'activity',
      route: '/dashboard/configuration/activity',
      labelKey: 'dashboardConfigurationTabActivity',
      mask: 2
    },
  ];

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
}
