import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, PageResponse } from '../models/common.models';
import {
  InitiatePaymentResponse,
  PaymentTransactionResponse,
  GetPaymentTransactionsParams,
} from '../models/payment.models';
import { OrderResponse } from '../models/order.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  constructor(private apiService: ApiService) {}

  initiateWavePayment(
    orderId: number,
    successUrl: string,
    errorUrl: string
  ): Observable<ApiResponse<InitiatePaymentResponse>> {
    const endpoint = `/payments/wave/initiate/${orderId}?successUrl=${encodeURIComponent(
      successUrl
    )}&errorUrl=${encodeURIComponent(errorUrl)}`;
    return this.apiService.post(endpoint, {});
  }

  getTransactionsByOrder(orderId: number): Observable<ApiResponse<PaymentTransactionResponse[]>> {
    return this.apiService.get(`/payments/transactions/order/${orderId}`);
  }

  getAllTransactions(
    params?: GetPaymentTransactionsParams
  ): Observable<ApiResponse<PageResponse<PaymentTransactionResponse>>> {
    return this.apiService.get('/payments/transactions', params);
  }

  // ---- Paiement manuel QR code ----

  notifyPayment(orderId: number, waveReference?: string): Observable<ApiResponse<null>> {
    return this.apiService.post(`/payments/manual/notify/${orderId}`, { waveReference: waveReference ?? null });
  }

  validatePayment(orderId: number): Observable<ApiResponse<OrderResponse>> {
    return this.apiService.patch(`/payments/manual/validate/${orderId}`);
  }

  rejectPayment(orderId: number): Observable<ApiResponse<OrderResponse>> {
    return this.apiService.patch(`/payments/manual/reject/${orderId}`);
  }

  getPendingValidationOrders(page = 0, size = 20): Observable<ApiResponse<PageResponse<OrderResponse>>> {
    return this.apiService.get('/payments/manual/pending', { page, size });
  }
}
