import { CategoryResponse } from './category.models';

export type MediaType = 'IMAGE' | 'VIDEO';
export type Gender = 'HOMME' | 'FEMME' | 'UNISEX';

export interface ProductMediaItem {
  id: number;
  url: string;
  mediaType: MediaType;
  position: number;
  altText?: string;
}

export interface ProductVariant {
  id: number;
  colorName: string;
  colorHex: string;
  imageUrl?: string;
  stock: number;
  createdAt?: string;
}

export interface ProductResponse {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  discountPercent?: number;
  salePrice?: number;
  stock: number;
  gender: Gender;
  imageUrl: string;
  media?: ProductMediaItem[];
  variants?: ProductVariant[];
  category: CategoryResponse;
  active: boolean;
  featured: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
  costPrice?: number;
  marginPercent?: number;
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
  inStock?: boolean;
  active?: boolean;
  featured?: boolean;
}
