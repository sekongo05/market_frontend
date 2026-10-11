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
  products?: { id?: number; slug: string; name: string; imageUrl?: string | null }[];
}

export interface WsStockUpdate {
  productId: number;
  stock: number;
  variantId?: number;
  variantStock?: number;
}

export interface WsOrderEvent {
  orderNumber: string;
  confirmedCount: number;
}

export interface WsOrderStatusUpdate {
  orderId: number;
  orderNumber: string;
  orderStatus: string;
  paymentStatus?: string;
}

export interface WsStaffEvent {
  module: 'orders' | 'products' | 'categories' | 'users' | 'deliveries' | 'returns' | 'promos' | 'reviews' | 'suppliers' | 'expenses' | 'purchase-orders' | 'finance';
  action: 'created' | 'updated' | 'deleted';
}
