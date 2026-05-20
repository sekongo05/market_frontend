export interface SupplierResponse {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  country?: string;
  notes?: string;
  active: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierRequest {
  name: string;
  phone?: string;
  email?: string;
  country?: string;
  notes?: string;
}

export interface ProductSupplierResponse {
  id: number;
  supplierId: number;
  supplierName: string;
  supplierCountry?: string;
  purchasePrice: number;
  transportCostPerUnit: number;
  realCost: number;
  isDefault: boolean;
  notes?: string;
  updatedAt: string;
}

export interface ProductSupplierRequest {
  supplierId: number;
  purchasePrice: number;
  transportCostPerUnit?: number;
  isDefault?: boolean;
  notes?: string;
}
