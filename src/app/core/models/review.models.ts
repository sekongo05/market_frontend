export interface ReviewResponse {
  id: number;
  productId: number;
  productName: string;
  userId: number;
  customerName: string;
  rating: number;
  comment: string | null;
  visible: boolean;
  createdAt: string;
}

export interface ProductRatingResponse {
  productId: number;
  averageRating: number;
  totalReviews: number;
}

export interface CreateReviewRequest {
  productId: number;
  rating: number;
  comment?: string;
}
