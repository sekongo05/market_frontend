export interface InitiatePaymentResponse {
  orderNumber: string;
  paymentUrl: string;
  checkoutSessionId: string;
}

export interface PaymentTransactionResponse {
  id: number;
  orderId: number;
  orderNumber: string;
  waveSessionId: string;
  waveTransactionId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: 'WAVE_CHECKOUT' | 'WAVE_MANUAL';
  processedBy: string | null;
  managerNote: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface GetPaymentTransactionsParams {
  page?: number;
  size?: number;
}
