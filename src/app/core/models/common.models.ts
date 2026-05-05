export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ValidationError {
  [key: string]: string;
}

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export enum OrderStatus {
  PENDING   = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED   = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum DeliveryStatus {
  PREPARING = 'PREPARING',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export enum NotificationType {
  ORDER_CREATED        = 'ORDER_CREATED',
  ORDER_CONFIRMED      = 'ORDER_CONFIRMED',
  ORDER_CANCELLED      = 'ORDER_CANCELLED',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  DELIVERY_UPDATE      = 'DELIVERY_UPDATE',
  CARRIER_ASSIGNED     = 'CARRIER_ASSIGNED',
  RETURN_REQUESTED     = 'RETURN_REQUESTED',
  RETURN_DECIDED       = 'RETURN_DECIDED',
  REVIEW_RECEIVED      = 'REVIEW_RECEIVED',
}

export enum StockMovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
}
