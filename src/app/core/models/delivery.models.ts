import { DeliveryStatus } from './common.models';

export interface DeliveryEventResponse {
  id: number;
  status: DeliveryStatus;
  description: string;
  location: string | null;
  createdAt: string;
}

export interface DeliveryResponse {
  id: number;
  orderId: number;
  orderNumber: string;
  trackingNumber: string;
  deliveryStatus: DeliveryStatus;
  deliveryAgent: string;
  estimatedDate: string;
  actualDeliveryDate: string | null;
  notes: string;
  events: DeliveryEventResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface AddDeliveryEventRequest {
  status: DeliveryStatus;
  description: string;
  location?: string;
}

export interface UpdateDeliveryRequest {
  deliveryAgent?: string;
  estimatedDate?: string;
  notes?: string;
}
