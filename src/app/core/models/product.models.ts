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

export interface ProductAttributeValueResponse {
  id: number;
  value: string;
  colorHex?: string;
  imageUrl?: string;
  sortOrder: number;
}

export interface ProductAttributeResponse {
  id: number;
  name: string;
  values: ProductAttributeValueResponse[];
  sortOrder: number;
}

export interface ProductVariant {
  id: number;
  variantName: string;
  colorHex?: string;
  imageUrl?: string;
  stock: number;
  sku?: string;
  barcode?: string;
  weight?: number;
  active: boolean;
  price?: number;
  attributeValues: ProductAttributeValueResponse[];
  createdAt?: string;
  updatedAt?: string;
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
  attributes: ProductAttributeResponse[];
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

export interface ProductAttributeRequest {
  name: string;
  values: ProductAttributeValueRequest[];
}

export interface ProductAttributeValueRequest {
  value: string;
  colorHex?: string;
  imageUrl?: string;
}

export interface GenerateVariantsRequest {
  attributeValueIds: number[];
  defaultStock?: number;
  defaultPrice?: number;
}
