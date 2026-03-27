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
  errorMessage: string | null;
  createdAt: string;
}

export interface GetPaymentTransactionsParams {
  page?: number;
  size?: number;
}
