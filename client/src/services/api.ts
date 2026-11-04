import { CategoriesResponse, PlacesResponse } from '../types/index.js';

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

async function request<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
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
