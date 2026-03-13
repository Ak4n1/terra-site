import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Bell, LucideAngularModule } from 'lucide-angular';
import { LanguageService } from '../../../../core/i18n/language.service';
import type { NotificationItem } from '../../../../core/notifications/notification.models';
import { NotificationsStore } from '../../../../core/notifications/notifications.store';
import { RealtimeStoreService } from '../../../../core/realtime/realtime-store.service';

@Component({
  selector: 'ui-notifications-dropdown',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './notifications-dropdown.component.html',
  styleUrl: './notifications-dropdown.component.css'
})
export class NotificationsDropdownComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);
  private readonly notificationsStore = inject(NotificationsStore);
  private readonly realtimeStore = inject(RealtimeStoreService);

  readonly bellIcon = Bell;
  readonly open = signal(false);
  readonly currentLanguage = this.languageService.language;
  readonly connectionState = this.realtimeStore.connectionState;
  readonly loading = this.notificationsStore.loading;
  readonly loadingMore = this.notificationsStore.loadingMore;
  readonly notifications = this.notificationsStore.notifications;
  readonly unreadCount = this.notificationsStore.unreadCount;
  readonly hasMore = this.notificationsStore.hasMore;
  readonly isEmpty = computed(() => this.notifications().length === 0);
  readonly hasUnread = computed(() => this.notifications().some(item => item.status === 'UNREAD'));

  t(key: string, params?: Record<string, string | number>): string {
    return this.languageService.t(key, params);
  }

  emptyStateKey(): string {
    switch (this.connectionState()) {
      case 'connecting':
        return 'dashboardNotificationsConnecting';
      case 'error':
      case 'disconnected':
        return 'dashboardNotificationsUnavailable';
      default:
        return 'dashboardNotificationsEmpty';
    }
  }

  toggle(): void {
    this.open.update(value => !value);
  }

  showMore(): void {
    this.notificationsStore.loadMore();
  }

  formatOccurredAt(value: string): string {
    const language = this.currentLanguage();
    const locale =
      language === 'es' ? 'es-AR' :
      language === 'pt' ? 'pt-BR' :
      language === 'fr' ? 'fr-FR' :
      language === 'de' ? 'de-DE' :
      'en-US';

    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  markAsRead(item: NotificationItem): void {
    if (item.status === 'READ') {
      return;
    }
    this.notificationsStore.markRead(item.id);
  }

  markAllAsRead(): void {
    this.notificationsStore.markAllRead();
  }

  async openAction(item: NotificationItem): Promise<void> {
    const route = item.action?.type === 'route' ? item.action.payload['route'] : null;
    if (typeof route !== 'string' || !route.startsWith('/dashboard')) {
      return;
    }

    this.markAsRead(item);
    this.open.set(false);
    await this.router.navigateByUrl(route);
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
