import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse } from '../../features/auth/models/api-response.model';
import type { NotificationBulkMutationPayload, NotificationListPayload, NotificationMutationPayload } from './notification.models';
import { NotificationMapper } from './notification.mapper';

@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly http = inject(HttpClient);
  private readonly mapper = inject(NotificationMapper);
  private readonly notificationsUrl = `${environment.apiBaseUrl}/api/notifications`;

  list(limit = 3, page = 0, unreadOnly = true): Observable<NotificationListPayload> {
    return this.http.get<ApiResponse<unknown>>(
      `${this.notificationsUrl}?limit=${limit}&page=${page}&unreadOnly=${unreadOnly}`
    ).pipe(
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
