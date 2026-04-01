export interface PaymentTransactionResponse {
  id: number;
  orderId: number;
  orderNumber: string;
  transactionReference: string | null;
  amount: number;
  currency: string;
  status: string;
  processedBy: string | null;
  managerNote: string | null;
  createdAt: string;
}

export interface GetPaymentTransactionsParams {
  page?: number;
  size?: number;
}
