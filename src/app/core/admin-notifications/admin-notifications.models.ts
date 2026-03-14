export type AdminNotificationTemplate = {
  code: string;
  category: string;
  severity: string;
  allowedTarget: 'INDIVIDUAL' | 'BROADCAST' | 'BOTH';
  titleKey: string;
  bodyKey: string;
  paramKeys: string[];
};

export type AdminNotificationDispatchRequest = {
  email: string;
  template: string;
  params: Record<string, string>;
};

export type AdminNotificationBroadcastRequest = {
  template: string;
  params: Record<string, string>;
  targetType: 'ROLE' | 'SEGMENT';
  targetValue: string;
};

export type AdminNotificationBroadcastResult = {
  template: string;
  targetType: string;
  targetValue: string;
  deliveredCount: number;
};

export type AdminNotificationAuditEntry = {
  notificationId: string;
  recipientEmail: string;
  template: string;
  category: string;
  severity: string;
  status: string;
  occurredAt: string;
};

export type AdminNotificationAuditSummary = {
  totalEntries: number;
  uniqueRecipients: number;
  uniqueTemplates: number;
  unreadEntries: number;
};

export type AdminNotificationAuditPayload = {
  items: AdminNotificationAuditEntry[];
  summary: AdminNotificationAuditSummary;
  page: number;
  size: number;
  hasMore: boolean;
  totalItems: number;
};

export type AdminNotificationAuditFilters = {
  dateFrom?: string;
  dateTo?: string;
  template?: string;
  status?: string;
};
