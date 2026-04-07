import { CategoryResponse } from './category.models';

export type MediaType = 'IMAGE' | 'VIDEO';
export type Gender = 'HOMME' | 'FEMME' | 'UNISEX';

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
  discountPercent?: number;
  salePrice?: number;
  stock: number;
  gender: Gender;
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
  gender: Gender;
  imageUrl: string;
  categoryId: number;
}

export interface UpdateProductRequest extends CreateProductRequest {}

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

export interface GetProductsParams {
  page?: number;
  size?: number;
  categoryId?: number;
  gender?: Gender;
  search?: string;
  sort?: SortOption;
  minPrice?: number;
  maxPrice?: number;
}
