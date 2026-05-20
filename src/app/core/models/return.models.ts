export type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface ReturnItemDto {
  productId: number;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  selectedColor: string | null;
}

export interface ReturnResponse {
  id: number;
  orderId: number;
  orderNumber: string;
  userId: number;
  customerName: string;
  status: ReturnStatus;
  reason: string;
  adminNote: string | null;
  processedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
  orderItems: ReturnItemDto[];
}

export interface CreateReturnRequest {
  orderId: number;
  reason: string;
}

export interface ReturnDecisionRequest {
  decision: ReturnStatus;
  adminNote?: string;
}
