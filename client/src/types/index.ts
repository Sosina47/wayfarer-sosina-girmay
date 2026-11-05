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

export interface User {
  id: number;
  name: string;
}

export interface UsersResponse {
  users: User[];
}

export interface ReviewItem {
  id: number;
  rating: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
  };
}

export interface TourSlotItem {
  id: number;
  startsAt: string;
  capacity: number;
  bookedSeats: number;
  seatsLeft: number;
}

export interface MyReviewItem {
  id: number;
  rating: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceDetails {
  id: number;
  name: string;
  category: string;
  description: string;
  address: string;
  openingHours: string;
  imageUrl: string | null;
  reviewCount: number;
  averageRating: number | null;
}

export interface PlaceDetailsResponse {
  place: PlaceDetails;
  reviews: ReviewItem[];
  tourSlots: TourSlotItem[];
  myReview: MyReviewItem | null;
}

export interface SaveReviewPayload {
  rating: number;
  body: string;
}

export interface ReviewResponse {
  review: {
    id: number;
    placeId: number;
    userId: number;
    rating: number;
    body: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface BookingResponse {
  booking: {
    id: number;
    slotId: number;
    seats: number;
    createdAt: string;
  };
  slot: {
    id: number;
    capacity: number;
    seatsLeft: number;
  };
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}
