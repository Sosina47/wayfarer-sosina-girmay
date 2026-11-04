import {
  CategoriesResponse,
  PlaceDetailsResponse,
  PlacesResponse,
  ReviewResponse,
  SaveReviewPayload,
  UsersResponse
} from '../types/index.js';

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let currentActingUserId: number | null = null;

/**
 * Updates the global acting user ID attached to outgoing HTTP requests via X-User-Id.
 */
export function setApiUserId(userId: number | null): void {
  currentActingUserId = userId;
}

export function getApiUserId(): number | null {
  return currentActingUserId;
}

async function request<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  // Attach acting user ID if selected
  if (currentActingUserId !== null && !headers.has('X-User-Id')) {
    headers.set('X-User-Id', String(currentActingUserId));
  }

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...init,
    headers
  });

  if (!response.ok) {
    let errorJson: { error?: { code?: string; message?: string; details?: unknown } } = {};
    try {
      errorJson = await response.json();
    } catch {
      // response was not JSON
    }

    const code = errorJson.error?.code || 'UNKNOWN_ERROR';
    const message = errorJson.error?.message || `Request failed with status ${response.status}`;
    throw new ApiError(response.status, code, message, errorJson.error?.details);
  }

  return response.json();
}

export async function getPlaces(params?: {
  category?: string;
  sort?: string;
}): Promise<PlacesResponse> {
  const query = new URLSearchParams();
  if (params?.category) {
    query.set('category', params.category);
  }
  if (params?.sort) {
    query.set('sort', params.sort);
  }

  const queryString = query.toString();
  const endpoint = queryString ? `/api/places?${queryString}` : '/api/places';
  return request<PlacesResponse>(endpoint);
}

export async function getCategories(): Promise<CategoriesResponse> {
  return request<CategoriesResponse>('/api/categories');
}

export async function getUsers(): Promise<UsersResponse> {
  return request<UsersResponse>('/api/users');
}

export async function getPlace(id: number | string): Promise<PlaceDetailsResponse> {
  return request<PlaceDetailsResponse>(`/api/places/${id}`);
}

export async function saveReview(
  placeId: number | string,
  payload: SaveReviewPayload
): Promise<ReviewResponse> {
  return request<ReviewResponse>(`/api/places/${placeId}/review`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}
