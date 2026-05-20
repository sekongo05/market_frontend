export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItemResponse {
  id: number;
  productId: number;
  productName: string;
  productSlug: string;
  quantity: number;
  receivedQuantity: number;
  unitPurchasePrice: number;
  transportCost: number;
  customsDuty: number;
  otherCosts: number;
  unitCostPrice: number;
  lineTotal: number;
  fullyReceived: boolean;
}

export interface GoodsReceiptResponse {
  id: number;
  receivedDate: string;
  receivedBy: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderResponse {
  id: number;
  supplierId: number;
  supplierName: string;
  supplierCountry?: string;
  createdById: number;
  createdByName: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  status: PurchaseOrderStatus;
  notes?: string;
  totalAmount: number;
  items?: PurchaseOrderItemResponse[];
  receipt?: GoodsReceiptResponse;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItemRequest {
  productId: number;
  quantity: number;
  unitPurchasePrice: number;
  transportCost?: number;
  customsDuty?: number;
  otherCosts?: number;
}

export interface PurchaseOrderRequest {
  supplierId: number;
  orderDate: string;
  expectedDeliveryDate?: string;
  status?: PurchaseOrderStatus;
  notes?: string;
  items?: PurchaseOrderItemRequest[];
}

export interface GoodsReceiptItemRequest {
  itemId: number;
  receivedQuantity: number;
}

export interface GoodsReceiptRequest {
  receivedDate: string;
  receivedBy: string;
  notes?: string;
  items: GoodsReceiptItemRequest[];
}
