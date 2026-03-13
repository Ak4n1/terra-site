import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthFacadeService } from '../../features/auth/services/auth-facade.service';
import type { RealtimeEventMessage } from '../realtime/realtime.models';
import { RealtimeService } from '../realtime/realtime.service';
import type { NotificationItem } from './notification.models';
import { NotificationsApi } from './notifications.api';
import { NotificationMapper } from './notification.mapper';

@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private static readonly DEFAULT_LIMIT = 3;

  private readonly authFacade = inject(AuthFacadeService);
  private readonly notificationsApi = inject(NotificationsApi);
  private readonly realtimeService = inject(RealtimeService);
  private readonly mapper = inject(NotificationMapper);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = signal(0);
  readonly hasMore = signal(false);
  readonly currentPage = signal(0);
  readonly hasUnread = computed(() => this.unreadCount() > 0);

  constructor() {
    const subscription = new Subscription();

    subscription.add(this.authFacade.authState$.subscribe(state => {
      if (state === 'authenticated') {
        this.bootstrap();
        return;
      }

      this.reset();
    }));

    subscription.add(this.realtimeService.events$.subscribe(message => {
      this.handleRealtimeMessage(message);
    }));

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  bootstrap(): void {
    this.loading.set(true);
    this.currentPage.set(0);
    this.notificationsApi.list(NotificationsStore.DEFAULT_LIMIT, 0, true).subscribe({
      next: payload => {
        this.notifications.set(payload.items);
        this.unreadCount.set(payload.unreadCount);
        this.hasMore.set(payload.hasMore);
        this.currentPage.set(payload.page);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  markRead(notificationId: string): void {
    this.notificationsApi.markRead(notificationId).subscribe({
      next: payload => {
        this.remove(payload.notification.id);
        this.unreadCount.set(payload.unreadCount);
      }
    });
  }

  markAllRead(): void {
    this.notificationsApi.markAllRead().subscribe({
      next: payload => {
        this.notifications.set([]);
        this.unreadCount.set(payload.unreadCount);
        this.hasMore.set(false);
        this.currentPage.set(0);
      }
    });
  }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }

    const nextPage = this.currentPage() + 1;
    this.loadingMore.set(true);
    this.notificationsApi.list(NotificationsStore.DEFAULT_LIMIT, nextPage, true).subscribe({
      next: payload => {
        this.notifications.update(items => [...items, ...payload.items.filter(item => !items.some(existing => existing.id === item.id))]);
        this.unreadCount.set(payload.unreadCount);
        this.hasMore.set(payload.hasMore);
        this.currentPage.set(payload.page);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loadingMore.set(false);
      }
    });
  }

  reset(): void {
    this.loading.set(false);
    this.loadingMore.set(false);
    this.notifications.set([]);
    this.unreadCount.set(0);
    this.hasMore.set(false);
    this.currentPage.set(0);
  }

  private handleRealtimeMessage(message: RealtimeEventMessage): void {
    switch (message.type) {
      case 'notification.created': {
        const source = this.asRecord(message.data);
        this.upsert(this.mapper.toItem(source['notification']));
        this.unreadCount.set(this.toUnreadCount(source['unreadCount']));
        break;
      }
      case 'notification.unread_count':
        this.unreadCount.set(this.toUnreadCount(this.asRecord(message.data)['unreadCount']));
        break;
      default:
        break;
    }
  }

  private upsert(notification: NotificationItem): void {
    if (!notification.id) {
      return;
    }

    this.notifications.update(items => {
      const filtered = items.filter(item => item.id !== notification.id);
      return [notification, ...filtered].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    });
  }

  private remove(notificationId: string): void {
    this.notifications.update(items => items.filter(item => item.id !== notificationId));
  }

  private toUnreadCount(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }
}
