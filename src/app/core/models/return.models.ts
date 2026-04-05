export type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

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
}

export interface CreateReturnRequest {
  orderId: number;
  reason: string;
}

export interface ReturnDecisionRequest {
  decision: ReturnStatus;
  adminNote?: string;
}
