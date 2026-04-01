import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, PageResponse } from '../models/common.models';
import { PaymentTransactionResponse, GetPaymentTransactionsParams } from '../models/payment.models';
import { OrderResponse } from '../models/order.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  constructor(private apiService: ApiService) {}

  // ── Actions client ─────────────────────────────────────────────────────────

  /** Déclare un paiement Wave QR code effectué */
  notifyPayment(orderId: number, paymentReference: string): Observable<ApiResponse<null>> {
    return this.apiService.post(`/payments/notify/${orderId}`, { paymentReference });
  }

  /** Historique des tentatives de paiement pour une commande (client, propriétaire) */
  getMyTransactionsByOrder(orderId: number): Observable<ApiResponse<PaymentTransactionResponse[]>> {
    return this.apiService.get(`/payments/order/${orderId}/my-transactions`);
  }

  // ── Actions admin / manager ────────────────────────────────────────────────

  /** Liste des commandes en attente de validation de paiement */
  getPendingValidationOrders(page = 0, size = 20): Observable<ApiResponse<PageResponse<OrderResponse>>> {
    return this.apiService.get('/payments/pending', { page, size });
  }

  /** Valider un paiement */
  validatePayment(orderId: number): Observable<ApiResponse<OrderResponse>> {
    return this.apiService.patch(`/payments/validate/${orderId}`);
  }

  /** Rejeter un paiement avec motif obligatoire */
  rejectPayment(orderId: number, reason: string): Observable<ApiResponse<OrderResponse>> {
    return this.apiService.patch(`/payments/reject/${orderId}`, { reason });
  }

  /** Toutes les transactions paginées */
  getAllTransactions(params?: GetPaymentTransactionsParams): Observable<ApiResponse<PageResponse<PaymentTransactionResponse>>> {
    return this.apiService.get('/payments/transactions', params);
  }

  /** Transactions d'une commande spécifique (admin/manager) */
  getTransactionsByOrder(orderId: number): Observable<ApiResponse<PaymentTransactionResponse[]>> {
    return this.apiService.get(`/payments/order/${orderId}/transactions`);
  }
}
