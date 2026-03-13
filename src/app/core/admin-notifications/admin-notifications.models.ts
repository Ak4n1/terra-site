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
