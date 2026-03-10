import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Bell, LucideAngularModule } from 'lucide-angular';
import { LanguageService } from '../../../../core/i18n/language.service';

type NotificationItem = {
  titleKey: string;
  timeKey: string;
};

@Component({
  selector: 'ui-notifications-dropdown',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './notifications-dropdown.component.html',
  styleUrl: './notifications-dropdown.component.css'
})
export class NotificationsDropdownComponent {
  private static readonly STEP = 3;
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly languageService = inject(LanguageService);

  readonly bellIcon = Bell;
  readonly open = signal(false);
  readonly visibleCount = signal(NotificationsDropdownComponent.STEP);
  readonly notifications: NotificationItem[] = [
    { titleKey: 'dashboardNotificationMaintenance', timeKey: 'dashboardNotificationMaintenanceTime' },
    { titleKey: 'dashboardNotificationCoin', timeKey: 'dashboardNotificationCoinTime' },
    { titleKey: 'dashboardNotificationSecurity', timeKey: 'dashboardNotificationSecurityTime' },
    { titleKey: 'dashboardNotificationSupport', timeKey: 'dashboardNotificationSupportTime' },
    { titleKey: 'dashboardNotificationVote', timeKey: 'dashboardNotificationVoteTime' },
    { titleKey: 'dashboardNotificationEvent', timeKey: 'dashboardNotificationEventTime' },
    { titleKey: 'dashboardNotificationClan', timeKey: 'dashboardNotificationClanTime' },
    { titleKey: 'dashboardNotificationShield', timeKey: 'dashboardNotificationShieldTime' },
    { titleKey: 'dashboardNotificationStore', timeKey: 'dashboardNotificationStoreTime' }
  ];
  readonly unreadCount = computed(() => this.notifications.length);
  readonly visibleNotifications = computed(() => this.notifications.slice(0, this.visibleCount()));
  readonly hasMore = computed(() => this.visibleCount() < this.notifications.length);
  readonly canShowLess = computed(() => this.visibleCount() > NotificationsDropdownComponent.STEP);

  t(key: string): string {
    return this.languageService.t(key);
  }

  toggle(): void {
    this.open.update(value => {
      const next = !value;
      if (next) {
        this.visibleCount.set(NotificationsDropdownComponent.STEP);
      }
      return next;
    });
  }

  showMore(): void {
    this.visibleCount.update(value => Math.min(value + NotificationsDropdownComponent.STEP, this.notifications.length));
  }

  showLess(): void {
    this.visibleCount.set(NotificationsDropdownComponent.STEP);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }
}
