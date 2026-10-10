export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  active: boolean;
  displayOrder?: number;
  defaultAttributes?: string;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  defaultAttributes?: string;
}

export interface UpdateCategoryRequest extends CreateCategoryRequest {}

export interface CategoryAttributeValueDef {
  name: string;
  hex?: string;
}

export interface CategoryAttributeDef {
  name: string;
  values: CategoryAttributeValueDef[];
}
