import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/common.models';
import {
  DeliveryResponse,
  AddDeliveryEventRequest,
  UpdateDeliveryRequest,
} from '../models/delivery.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class DeliveryService {
  constructor(private apiService: ApiService) {}

  trackDelivery(trackingNumber: string): Observable<ApiResponse<DeliveryResponse>> {
    return this.apiService.get(`/delivery/track/${trackingNumber}`);
  }

  getDeliveryByOrder(orderId: number): Observable<ApiResponse<DeliveryResponse>> {
    return this.apiService.get(`/delivery/order/${orderId}`);
  }

  addDeliveryEvent(
    deliveryId: number,
    data: AddDeliveryEventRequest
  ): Observable<ApiResponse<DeliveryResponse>> {
    return this.apiService.post(`/delivery/${deliveryId}/events`, data);
  }

  updateDelivery(
    deliveryId: number,
    data: UpdateDeliveryRequest
  ): Observable<ApiResponse<DeliveryResponse>> {
    return this.apiService.patch(`/delivery/${deliveryId}`, data);
  }
}
