import { StockMovementType } from './common.models';

export interface AddStockRequest {
  productId: number;
  quantity: number;
  reason: string;
}

export interface AdjustStockRequest {
  productId: number;
  newStock: number;
  reason: string;
}

export interface StockMovementResponse {
  id: number;
  productId: number;
  productName: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface LowStockResponse {
  productId: number;
  productName: string;
  slug: string;
  stock: number;
}

export interface GetStockMovementsParams {
  page?: number;
  size?: number;
}

export interface GetLowStockParams {
  threshold: number;
}
