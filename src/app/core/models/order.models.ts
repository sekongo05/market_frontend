import { OrderStatus, PaymentStatus, DeliveryStatus } from './common.models';

export interface OrderItem {
  productId: number;
  quantity: number;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  deliveryAddress: string;
}

export interface OrderItemResponse {
  productId: number;
  productName: string;
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
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  deliveryAddress: string;
  paymentReference: string | null;
  lastPaymentNote: string | null;
  trackingNumber: string | null;
  customerName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetOrdersParams {
  page?: number;
  size?: number;
  status?: OrderStatus;
}
