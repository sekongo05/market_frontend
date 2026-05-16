import { NotificationType } from './common.models';

export interface NotificationResponse {
  id: number;
  type: NotificationType;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface GetNotificationsParams {
  page?: number;
  size?: number;
}

export interface WsNotification {
  id?: number;
  type: string;
  subject: string;
  createdAt?: string;
  products?: { slug: string; name: string }[];
}

export interface WsStockUpdate {
  productId: number;
  stock: number;
  variantId?: number;
  variantStock?: number;
}

export interface WsOrderEvent {
  orderNumber: string;
  pendingCount: number;
}

export interface WsOrderStatusUpdate {
  orderId: number;
  orderNumber: string;
  orderStatus: string;
}

export interface WsStaffEvent {
  module: 'products' | 'categories' | 'users' | 'deliveries' | 'returns' | 'promos' | 'reviews';
  action: 'created' | 'updated' | 'deleted';
}
