import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse } from '../../features/auth/models/api-response.model';
import type { NotificationMutationPayload } from '../notifications/notification.models';
import { NotificationMapper } from '../notifications/notification.mapper';
import type {
  AdminNotificationAuditFilters,
  AdminNotificationAuditPayload,
  AdminNotificationBroadcastRequest,
  AdminNotificationBroadcastResult,
  AdminNotificationDispatchRequest,
  AdminNotificationTemplate
} from './admin-notifications.models';

@Injectable({ providedIn: 'root' })
export class AdminNotificationsApi {
  private readonly http = inject(HttpClient);
  private readonly notificationMapper = inject(NotificationMapper);
  private readonly adminNotificationsUrl = `${environment.apiBaseUrl}/api/admin/notifications`;

  listTemplates(): Observable<AdminNotificationTemplate[]> {
    return this.http.get<ApiResponse<AdminNotificationTemplate[]>>(`${this.adminNotificationsUrl}/templates`).pipe(
      map(response => response.data ?? [])
    );
  }

  listAudit(page = 0, size = 4, filters?: AdminNotificationAuditFilters): Observable<AdminNotificationAuditPayload> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size)
    });

    if (filters?.dateFrom) {
      params.set('dateFrom', filters.dateFrom);
    }

    if (filters?.dateTo) {
      params.set('dateTo', filters.dateTo);
    }

    if (filters?.template) {
      params.set('template', filters.template);
    }

    if (filters?.status) {
      params.set('status', filters.status);
    }

    return this.http.get<ApiResponse<AdminNotificationAuditPayload>>(
      `${this.adminNotificationsUrl}/audit?${params.toString()}`
    ).pipe(
      map(response => {
        if (!response.data) {
          throw new Error('Missing audit payload');
        }
        return response.data;
      })
    );
  }

  dispatch(request: AdminNotificationDispatchRequest): Observable<NotificationMutationPayload> {
    return this.http.post<ApiResponse<unknown>>(this.adminNotificationsUrl, request).pipe(
      map(response => this.notificationMapper.toMutationPayload(response.data))
    );
  }

  broadcast(request: AdminNotificationBroadcastRequest): Observable<AdminNotificationBroadcastResult> {
    return this.http.post<ApiResponse<AdminNotificationBroadcastResult>>(`${this.adminNotificationsUrl}/broadcast`, request).pipe(
      map(response => {
        if (!response.data) {
          throw new Error('Missing broadcast payload');
        }
        return response.data;
      })
    );
  }
}
