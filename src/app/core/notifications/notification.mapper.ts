import { Injectable } from '@angular/core';
import type {
  NotificationAction,
  NotificationBulkMutationPayload,
  NotificationItem,
  NotificationListPayload,
  NotificationMutationPayload
} from './notification.models';

@Injectable({ providedIn: 'root' })
export class NotificationMapper {
  toListPayload(payload: unknown): NotificationListPayload {
    const source = this.asRecord(payload);
    const items = Array.isArray(source['items']) ? source['items'].map(item => this.toItem(item)) : [];
    return {
      items,
      unreadCount: this.toNonNegativeNumber(source['unreadCount']),
      hasMore: this.toBoolean(source['hasMore']),
      page: this.toNonNegativeNumber(source['page']),
      size: this.toNonNegativeNumber(source['size'])
    };
  }

  toMutationPayload(payload: unknown): NotificationMutationPayload {
    const source = this.asRecord(payload);
    return {
      notification: this.toItem(source['notification']),
      unreadCount: this.toNonNegativeNumber(source['unreadCount'])
    };
  }

  toBulkMutationPayload(payload: unknown): NotificationBulkMutationPayload {
    const source = this.asRecord(payload);
    return {
      unreadCount: this.toNonNegativeNumber(source['unreadCount']),
      updatedCount: this.toNonNegativeNumber(source['updatedCount'])
    };
  }

  toItem(payload: unknown): NotificationItem {
    const source = this.asRecord(payload);
    return {
      id: this.toString(source['id']),
      type: this.toString(source['type']),
      category: this.toString(source['category']),
      severity: this.toString(source['severity']),
      titleKey: this.toString(source['titleKey']),
      bodyKey: this.toString(source['bodyKey']),
      params: this.toParams(source['params']),
      status: source['status'] === 'READ' ? 'READ' : 'UNREAD',
      action: this.toAction(source['action']),
      occurredAt: this.toString(source['occurredAt']),
      readAt: this.toNullableString(source['readAt'])
    };
  }

  private toAction(payload: unknown): NotificationAction | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const source = this.asRecord(payload);
    return {
      type: this.toString(source['type']),
      labelKey: this.toString(source['labelKey']),
      payload: this.asRecord(source['payload'])
    };
  }

  private toParams(payload: unknown): Record<string, string | number> {
    const source = this.asRecord(payload);
    return Object.entries(source).reduce<Record<string, string | number>>((accumulator, [key, value]) => {
      if (typeof value === 'string' || typeof value === 'number') {
        accumulator[key] = value;
      }
      return accumulator;
    }, {});
  }

  private toNonNegativeNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  }

  private toBoolean(value: unknown): boolean {
    return value === true;
  }

  private toString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private toNullableString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }
}
