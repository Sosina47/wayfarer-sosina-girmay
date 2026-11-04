export interface Place {
  id: number;
  name: string;
  category: string;
  description: string;
  imageUrl: string | null;
  reviewCount: number;
  averageRating: number | null;
  score: number;
}

export interface PlacesResponse {
  places: Place[];
}

export interface CategoriesResponse {
  categories: string[];
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}
