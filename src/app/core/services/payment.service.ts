import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/common.models';
import { InitiatePaymentRequest, InitiatePaymentResponse } from '../models/payment.models';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {

  constructor(private apiService: ApiService) {}

  initiate(data: InitiatePaymentRequest): Observable<ApiResponse<InitiatePaymentResponse>> {
    return this.apiService.post('/payments/initiate', data);
  }
}
