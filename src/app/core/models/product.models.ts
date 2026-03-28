import { CategoryResponse } from './category.models';

export type MediaType = 'IMAGE' | 'VIDEO';

export interface ProductMediaItem {
  id: number;
  url: string;
  mediaType: MediaType;
  position: number;
}

export interface ProductResponse {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  media?: ProductMediaItem[];
  category: CategoryResponse;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  categoryId: number;
}

export interface UpdateProductRequest extends CreateProductRequest {}

export interface GetProductsParams {
  page?: number;
  size?: number;
  categoryId?: number;
  search?: string;
}
