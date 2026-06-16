export interface InitiatePaymentRequest {
  orderId: number;
  successUrl: string;
  errorUrl: string;
}

export interface InitiatePaymentResponse {
  reference: string;
  checkoutUrl: string;
}
