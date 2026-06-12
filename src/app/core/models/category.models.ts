export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  active: boolean;
  displayOrder?: number;
  productCount?: number;
  variantConfig?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  variantConfig?: string;
}

export interface UpdateCategoryRequest extends CreateCategoryRequest {}
