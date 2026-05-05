import { OrderStatus, DeliveryStatus } from './common.models';

export interface OrderItem {
  productId: number;
  quantity: number;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  deliveryAddress: string;
  promoCode?: string;
}

export interface OrderItemResponse {
  productId: number;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderResponse {
  id: number;
  orderNumber: string;
  items: OrderItemResponse[];
  totalAmount: number;
  orderStatus: OrderStatus;
  deliveryStatus: DeliveryStatus;
  deliveryAddress: string;
  trackingNumber: string | null;
  customerName: string | null;
  promoCode: string | null;
  discountAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetOrdersParams {
  page?: number;
  size?: number;
  status?: OrderStatus;
}
