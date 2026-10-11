export interface SmartActionItem {
  id: string;
  type: 'ORDER_PENDING' | 'RETURN_PENDING' | 'LOW_STOCK' | 'DELIVERY_DELAY' | 'INFO';
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY' | 'INFO';
  title: string;
  description: string;
  metric?: string;
  targetUrl: string;
  actionLabel: string;
  quickActionType?: 'VIEW_ORDERS' | 'VIEW_RETURNS' | 'VIEW_STOCK' | 'QUICK_CONFIRM';
}

export interface LiveActivityEvent {
  id: string;
  timestamp: Date;
  module: string;
  action: string;
  title: string;
  detail: string;
  badgeClass: string;
  iconType: 'order' | 'stock' | 'return' | 'delivery' | 'user' | 'system';
}

export type GranularityPeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR';
