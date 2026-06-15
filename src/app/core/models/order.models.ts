import { OrderStatus, PaymentStatus, DeliveryStatus, DeliveryZone } from './common.models';

export interface OrderItem {
  productId: number;
  quantity: number;
  variantId?: number;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  deliveryAddress: string;
  deliveryZone: DeliveryZone;
  promoCode?: string;
}

export interface OrderItemResponse {
  productId: number;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  selectedColor?: string;
  selectedColorHex?: string;
}

export interface OrderResponse {
  id: number;
  orderNumber: string;
  items: OrderItemResponse[];
  totalAmount: number;
  orderStatus: OrderStatus;
  paymentStatus?: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  deliveryZone: DeliveryZone | null;
  deliveryAddress: string;
  trackingNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
  promoCode: string | null;
  discountAmount: number | null;
  shippingFee: number | null;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
}

export interface GetOrdersParams {
  page?: number;
  size?: number;
  status?: OrderStatus;
  search?: string;
  dateRange?: 'today' | 'week' | 'month';
}
