import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse } from '../../features/auth/models/api-response.model';
import type {
  NotificationBulkMutationPayload,
  NotificationListFilters,
  NotificationListPayload,
  NotificationMutationPayload
} from './notification.models';
import { NotificationMapper } from './notification.mapper';

@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly http = inject(HttpClient);
  private readonly mapper = inject(NotificationMapper);
  private readonly notificationsUrl = `${environment.apiBaseUrl}/api/notifications`;

  list(limit = 3, page = 0, unreadOnly = true): Observable<NotificationListPayload> {
    return this.listFiltered(limit, page, { unreadOnly });
  }

  listFiltered(limit = 3, page = 0, filters: NotificationListFilters = {}): Observable<NotificationListPayload> {
    let params = new HttpParams()
      .set('limit', String(limit))
      .set('page', String(page));

    if (typeof filters.unreadOnly === 'boolean') {
      params = params.set('unreadOnly', String(filters.unreadOnly));
    }

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (filters.sort) {
      params = params.set('sort', filters.sort);
    }

    if (filters.dateFrom?.trim()) {
      params = params.set('dateFrom', filters.dateFrom.trim());
    }

    if (filters.dateTo?.trim()) {
      params = params.set('dateTo', filters.dateTo.trim());
    }

    return this.http.get<ApiResponse<unknown>>(this.notificationsUrl, { params }).pipe(
      map(response => this.mapper.toListPayload(response.data))
    );
  }

  markRead(notificationId: string): Observable<NotificationMutationPayload> {
    return this.http.patch<ApiResponse<unknown>>(`${this.notificationsUrl}/${notificationId}/read`, {}).pipe(
      map(response => this.mapper.toMutationPayload(response.data))
    );
  }

  markAllRead(): Observable<NotificationBulkMutationPayload> {
    return this.http.patch<ApiResponse<unknown>>(`${this.notificationsUrl}/read-all`, {}).pipe(
      map(response => this.mapper.toBulkMutationPayload(response.data))
    );
  }
}
