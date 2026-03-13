export interface NotificationAction {
  type: string;
  labelKey: string;
  payload: Record<string, unknown>;
}

export interface NotificationItem {
  id: string;
  type: string;
  category: string;
  severity: string;
  titleKey: string;
  bodyKey: string;
  params: Record<string, string | number>;
  status: 'UNREAD' | 'READ';
  action: NotificationAction | null;
  occurredAt: string;
  readAt: string | null;
}

export interface NotificationListPayload {
  items: NotificationItem[];
  unreadCount: number;
  hasMore: boolean;
  page: number;
  size: number;
}

export interface NotificationMutationPayload {
  notification: NotificationItem;
  unreadCount: number;
}

export interface NotificationBulkMutationPayload {
  unreadCount: number;
  updatedCount: number;
}
