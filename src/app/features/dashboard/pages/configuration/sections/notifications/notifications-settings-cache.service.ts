import { Injectable, inject } from '@angular/core';
import { finalize } from 'rxjs';
import { NotificationsApi } from '../../../../../../core/notifications/notifications.api';
import type { NotificationListPayload } from '../../../../../../core/notifications/notification.models';

@Injectable({ providedIn: 'root' })
export class NotificationsSettingsCacheService {
  private static readonly CACHE_TTL_MS = 30_000;
  private readonly notificationsApi = inject(NotificationsApi);

  private cachedDefault: { at: number; payload: NotificationListPayload } | null = null;
  private prefetchInFlight = false;

  prefetchDefault(): void {
    if (this.prefetchInFlight) {
      return;
    }

    if (this.getDefaultSnapshot()) {
      return;
    }

    this.prefetchInFlight = true;
    this.notificationsApi.listFiltered(5, 0, { sort: 'desc' }).pipe(
      finalize(() => {
        this.prefetchInFlight = false;
      })
    ).subscribe({
      next: payload => {
        this.setDefaultSnapshot(payload);
      },
      error: () => {
        // Ignore prefetch errors; section load will handle real errors.
      }
    });
  }

  getDefaultSnapshot(): NotificationListPayload | null {
    if (!this.cachedDefault) {
      return null;
    }

    if ((Date.now() - this.cachedDefault.at) > NotificationsSettingsCacheService.CACHE_TTL_MS) {
      this.cachedDefault = null;
      return null;
    }

    return this.cachedDefault.payload;
  }

  setDefaultSnapshot(payload: NotificationListPayload): void {
    this.cachedDefault = {
      at: Date.now(),
      payload
    };
  }
}
