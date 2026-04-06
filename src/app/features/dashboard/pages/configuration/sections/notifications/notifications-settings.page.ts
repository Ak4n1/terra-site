import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs';
import { LanguageService } from '../../../../../../core/i18n/language.service';
import { NotificationsApi } from '../../../../../../core/notifications/notifications.api';
import type {
  NotificationItem,
  NotificationSortDirection,
  NotificationStatusFilter
} from '../../../../../../core/notifications/notification.models';
import { AlertComponent, type AlertVariant } from '../../../../../../shared/ui/atoms/alert/alert.component';
import { ButtonComponent } from '../../../../../../shared/ui/atoms/button/button.component';
import { DateControlComponent } from '../../../../../../shared/ui/atoms/date-control/date-control.component';
import { OrbSpinnerComponent } from '../../../../../../shared/ui/atoms/orb-spinner/orb-spinner.component';
import { SelectFieldComponent } from '../../../../../../shared/ui/molecules/select-field/select-field.component';
import type { SelectControlOption } from '../../../../../../shared/ui/atoms/select-control/select-control.component';
import { NotificationsSettingsCacheService } from './notifications-settings-cache.service';
import { NotificationsStore, type NotificationSyncEvent } from '../../../../../../core/notifications/notifications.store';

type NotificationPageItem =
  | { type: 'page'; page: number }
  | { type: 'ellipsis'; id: string };

@Component({
  selector: 'app-notifications-settings-page',
  standalone: true,
  imports: [CommonModule, AlertComponent, ButtonComponent, DateControlComponent, OrbSpinnerComponent, SelectFieldComponent],
  templateUrl: './notifications-settings.page.html',
  styleUrl: './notifications-settings.page.css'
})
export class NotificationsSettingsPage implements OnInit, OnDestroy {
  private static readonly PAGE_SIZE = 5;
  private static readonly PAGINATION_WINDOW = 1;
  private static readonly PAGINATION_EDGE = 1;
  private static readonly ITEM_MASK_IMAGES = [
    "url('/assets/images/clipping_masks/34294919_rectangle_brushes_shape_1.svg')",
    "url('/assets/images/clipping_masks/34294919_rectangle_brushes_shape_2.svg')",
    "url('/assets/images/clipping_masks/34294919_rectangle_brushes_shape_3.svg')",
    "url('/assets/images/clipping_masks/34294919_rectangle_brushes_shape_5.svg')"
  ] as const;

  private readonly languageService = inject(LanguageService);
  private readonly notificationsApi = inject(NotificationsApi);
  private readonly notificationsStore = inject(NotificationsStore);
  private readonly cache = inject(NotificationsSettingsCacheService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();
  readonly language = this.languageService.language;

  loading = false;
  marking = false;
  page = 0;
  size = NotificationsSettingsPage.PAGE_SIZE;
  hasMore = false;
  totalUnread = 0;
  notifications: NotificationItem[] = [];
  statusFilter: NotificationStatusFilter = 'ALL';
  sortFilter: NotificationSortDirection = 'desc';
  dateFrom = '';
  dateTo = '';
  message = '';
  messageKind: 'warning' | 'error' = 'warning';

  ngOnInit(): void {
    this.subscriptions.add(
      this.notificationsStore.syncEvents$.subscribe(event => {
        this.runInUi(() => {
          this.handleSyncEvent(event);
        });
      })
    );

    const cached = this.cache.getDefaultSnapshot();
    if (cached) {
      this.applyPayload(cached);
      return;
    }

    this.loadNotifications(0);
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.languageService.t(key, params);
  }

  alertVariant(): AlertVariant {
    return this.messageKind === 'warning' ? 'warning' : 'error';
  }

  statusOptions(): SelectControlOption[] {
    return [
      { value: 'ALL', label: this.t('dashboardConfigurationNotificationsFilterStatusAll') },
      { value: 'UNREAD', label: this.t('dashboardConfigurationNotificationsFilterStatusUnread') },
      { value: 'READ', label: this.t('dashboardConfigurationNotificationsFilterStatusRead') }
    ];
  }

  sortOptions(): SelectControlOption[] {
    return [
      { value: 'desc', label: this.t('dashboardConfigurationNotificationsSortNewest') },
      { value: 'asc', label: this.t('dashboardConfigurationNotificationsSortOldest') }
    ];
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter = value === 'READ' || value === 'UNREAD' ? value : 'ALL';
  }

  onSortFilterChange(value: string): void {
    this.sortFilter = value === 'asc' ? 'asc' : 'desc';
  }

  applyFilters(): void {
    if (!this.validateDateRange()) {
      return;
    }
    this.loadNotifications(0);
  }

  clearFilters(): void {
    this.statusFilter = 'ALL';
    this.sortFilter = 'desc';
    this.dateFrom = '';
    this.dateTo = '';
    this.message = '';
    this.loadNotifications(0);
  }

  hasActiveFilters(): boolean {
    return this.statusFilter !== 'ALL'
      || this.sortFilter !== 'desc'
      || this.dateFrom.trim().length > 0
      || this.dateTo.trim().length > 0;
  }

  canGoPrevious(): boolean {
    return !this.loading && this.page > 0;
  }

  canGoNext(): boolean {
    return !this.loading && this.hasMore;
  }

  previousPage(): void {
    if (!this.canGoPrevious()) {
      return;
    }
    this.loadNotifications(this.page - 1);
  }

  nextPage(): void {
    if (!this.canGoNext()) {
      return;
    }
    this.loadNotifications(this.page + 1);
  }

  goToPage(page: number): void {
    if (this.loading || page === this.page || page < 0 || page >= this.totalPages()) {
      return;
    }

    this.loadNotifications(page);
  }

  paginationItems(): NotificationPageItem[] {
    return this.buildPaginationItems(this.totalPages(), this.page);
  }

  trackPaginationItem(index: number, item: NotificationPageItem): string {
    return item.type === 'page' ? `page-${item.page}` : `ellipsis-${item.id}-${index}`;
  }

  totalPages(): number {
    return Math.max(1, this.page + (this.hasMore ? 2 : 1));
  }

  formatOccurredAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const language = this.languageService.language();
    const locale =
      language === 'es' ? 'es-AR' :
      language === 'pt' ? 'pt-BR' :
      language === 'fr' ? 'fr-FR' :
      language === 'de' ? 'de-DE' :
      'en-US';

    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  notificationMaskImageFor(index: number): string {
    const visualIndex = (this.page * this.size) + index;
    return NotificationsSettingsPage.ITEM_MASK_IMAGES[
      visualIndex % NotificationsSettingsPage.ITEM_MASK_IMAGES.length
    ];
  }

  markAsRead(item: NotificationItem): void {
    if (item.status === 'READ' || this.marking) {
      return;
    }

    this.runInUi(() => {
      this.marking = true;
    });
    this.notificationsApi.markRead(item.id).pipe(
      finalize(() => {
        this.runInUi(() => {
          this.marking = false;
        });
      })
    ).subscribe({
      next: payload => {
        this.runInUi(() => {
          this.totalUnread = payload.unreadCount;
          this.notificationsStore.syncReadFromExternal(payload.notification.id, payload.unreadCount, payload.notification.readAt);
          this.notifications = this.notifications.map(notification =>
            notification.id === item.id
              ? { ...notification, status: 'READ', readAt: payload.notification.readAt }
              : notification
          );

          if (this.statusFilter === 'UNREAD') {
            this.notifications = this.notifications.filter(notification => notification.id !== item.id);
          }
        });
      },
      error: () => {
        this.runInUi(() => {
          this.messageKind = 'error';
          this.message = this.t('dashboardConfigurationNotificationsLoadError');
        });
      }
    });
  }

  isUnread(item: NotificationItem): boolean {
    return item.status === 'UNREAD';
  }

  onDateFromChange(value: string): void {
    this.dateFrom = value;
  }

  onDateToChange(value: string): void {
    this.dateTo = value;
  }

  private loadNotifications(page: number): void {
    this.runInUi(() => {
      this.loading = true;
      this.message = '';
    });
    this.notificationsApi.listFiltered(this.size, page, {
      status: this.statusFilter === 'ALL' ? undefined : this.statusFilter,
      sort: this.sortFilter,
      dateFrom: this.dateFrom || undefined,
      dateTo: this.dateTo || undefined
    }).pipe(
      finalize(() => {
        this.runInUi(() => {
          this.loading = false;
        });
      })
    ).subscribe({
      next: payload => {
        this.runInUi(() => {
          this.applyPayload(payload);
          if (this.isDefaultQuery(page)) {
            this.cache.setDefaultSnapshot(payload);
          }
        });
      },
      error: () => {
        this.runInUi(() => {
          this.notifications = [];
          this.hasMore = false;
          this.page = Math.max(0, page);
          this.messageKind = 'error';
          this.message = this.t('dashboardConfigurationNotificationsLoadError');
        });
      }
    });
  }

  private applyPayload(payload: {
    items: NotificationItem[];
    hasMore: boolean;
    unreadCount: number;
    page: number;
    size: number;
  }): void {
    this.notifications = payload.items;
    this.hasMore = payload.hasMore;
    this.totalUnread = payload.unreadCount;
    this.page = payload.page;
    this.size = payload.size || NotificationsSettingsPage.PAGE_SIZE;
  }

  private isDefaultQuery(page: number): boolean {
    return page === 0
      && this.statusFilter === 'ALL'
      && this.sortFilter === 'desc'
      && !this.dateFrom
      && !this.dateTo;
  }

  private validateDateRange(): boolean {
    if (!this.dateFrom || !this.dateTo) {
      this.message = '';
      return true;
    }

    if (this.dateFrom <= this.dateTo) {
      this.message = '';
      return true;
    }

    this.messageKind = 'warning';
    this.message = this.t('dashboardConfigurationNotificationsDateRangeInvalid');
    return false;
  }

  private buildPaginationItems(totalPages: number, currentPage: number): NotificationPageItem[] {
    if (totalPages <= 0) {
      return [];
    }

    const maxPage = totalPages - 1;
    const current = Math.min(Math.max(currentPage, 0), maxPage);
    const selectedPages = new Set<number>();

    for (let page = 0; page < NotificationsSettingsPage.PAGINATION_EDGE; page += 1) {
      selectedPages.add(page);
      selectedPages.add(maxPage - page);
    }

    for (
      let page = current - NotificationsSettingsPage.PAGINATION_WINDOW;
      page <= current + NotificationsSettingsPage.PAGINATION_WINDOW;
      page += 1
    ) {
      if (page >= 0 && page <= maxPage) {
        selectedPages.add(page);
      }
    }

    const orderedPages = Array.from(selectedPages)
      .filter(page => page >= 0 && page <= maxPage)
      .sort((left, right) => left - right);

    const items: NotificationPageItem[] = [];
    for (let index = 0; index < orderedPages.length; index += 1) {
      const nextPage = orderedPages[index];
      const previous = index > 0 ? orderedPages[index - 1] : null;

      if (previous !== null && nextPage - previous > 1) {
        items.push({ type: 'ellipsis', id: `${previous + 1}-${nextPage - 1}` });
      }

      items.push({ type: 'page', page: nextPage });
    }

    return items;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private handleSyncEvent(event: NotificationSyncEvent): void {
    if (event.type === 'unread_count') {
      this.totalUnread = event.unreadCount;
      return;
    }

    if (event.type === 'read') {
      this.totalUnread = event.unreadCount;
      this.notifications = this.notifications.map(notification =>
        notification.id === event.notificationId
          ? { ...notification, status: 'READ', readAt: event.readAt }
          : notification
      );

      if (this.statusFilter === 'UNREAD') {
        this.notifications = this.notifications.filter(notification => notification.id !== event.notificationId);
      }
      return;
    }

    if (event.type === 'read_all') {
      this.totalUnread = event.unreadCount;
      if (this.statusFilter === 'UNREAD') {
        this.notifications = [];
        this.hasMore = false;
      } else {
        this.notifications = this.notifications.map(notification => ({
          ...notification,
          status: 'READ',
          readAt: notification.readAt ?? new Date().toISOString()
        }));
      }
      return;
    }

    this.totalUnread = event.unreadCount;
    if (this.shouldRefetchForCreated(event.notification)) {
      this.loadNotifications(this.page);
    }
  }

  private shouldRefetchForCreated(notification: NotificationItem): boolean {
    if (this.statusFilter === 'READ') {
      return false;
    }

    const notificationDate = notification.occurredAt.slice(0, 10);
    if (this.dateFrom && notificationDate < this.dateFrom) {
      return false;
    }

    if (this.dateTo && notificationDate > this.dateTo) {
      return false;
    }

    return true;
  }

  private runInUi(action: () => void): void {
    if (NgZone.isInAngularZone()) {
      action();
      this.cdr.markForCheck();
      return;
    }

    this.ngZone.run(() => {
      action();
      this.cdr.markForCheck();
    });
  }
}
