export interface PromoResponse {
  id: number;
  code: string;
  discountPercent: number;
  active: boolean;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  description: string | null;
  publicVisible: boolean;
  firstOrderOnly: boolean;
  minCartAmount: number | null;
  createdAt: string;
}

export interface PromoCheckResponse {
  code: string;
  discountPercent: number;
  discountAmount: number;
  finalAmount: number;
  valid: boolean;
  message: string;
}

export interface PublicPromoResponse {
  code: string;
  discountPercent: number;
  description: string | null;
  expiresAt: string | null;
  firstOrderOnly: boolean;
  minCartAmount: number | null;
}

export interface CreatePromoRequest {
  code: string;
  discountPercent: number;
  expiresAt?: string;
  maxUses?: number;
  description?: string;
  publicVisible?: boolean;
  firstOrderOnly?: boolean;
  minCartAmount?: number;
}
