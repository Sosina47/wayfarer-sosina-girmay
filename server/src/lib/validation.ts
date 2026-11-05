import { ValidationError } from './errors.js';

export type SortOption = 'top-rated' | 'name';

export const MAX_SEATS_PER_BOOKING = 10;

/**
 * Validates and normalizes the sorting query parameter.
 * Defaults to 'top-rated' when omitted or empty.
 */
export function parseSort(val: unknown): SortOption {
  if (val === undefined || val === null || val === '') {
    return 'top-rated';
  }

  if (typeof val !== 'string') {
    throw new ValidationError("Invalid 'sort' query parameter. Allowed values: 'top-rated', 'name'.");
  }

  const normalized = val.trim().toLowerCase();

  if (normalized === 'top-rated') {
    return 'top-rated';
  }

  if (normalized === 'name') {
    return 'name';
  }

  throw new ValidationError("Invalid 'sort' query parameter. Allowed values: 'top-rated', 'name'.");
}

/**
 * Normalizes the category filter parameter.
 * Returns trimmed category string or undefined if empty/omitted.
 */
export function parseCategory(val: unknown): string | undefined {
  if (typeof val !== 'string') {
    return undefined;
  }
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Validates that an ID parameter is a positive integer.
 */
export function parseId(val: unknown, paramName = 'ID'): number {
  if (val === undefined || val === null) {
    throw new ValidationError(`Invalid ${paramName}. Expected a positive integer.`);
  }

  const str = String(val).trim();
  if (!/^\d+$/.test(str)) {
    throw new ValidationError(`Invalid ${paramName}. Expected a positive integer.`);
  }

  const num = parseInt(str, 10);
  if (num <= 0 || !Number.isSafeInteger(num)) {
    throw new ValidationError(`Invalid ${paramName}. Expected a positive integer.`);
  }

  return num;
}

/**
 * Validates rating as an integer between 1 and 5.
 * Rejects floats and numeric strings.
 */
export function parseRating(val: unknown): number {
  if (typeof val !== 'number' || !Number.isInteger(val) || val < 1 || val > 5) {
    throw new ValidationError('Rating must be an integer between 1 and 5.');
  }

  return val;
}

/**
 * Validates and trims the review body according to agreed SRS length requirements (1-500 characters).
 */
export function parseReviewBody(val: unknown): string {
  if (typeof val !== 'string') {
    throw new ValidationError('Review body must be a string.');
  }

  const trimmed = val.trim();
  if (trimmed.length < 1 || trimmed.length > 500) {
    throw new ValidationError('Review body must be between 1 and 500 characters.');
  }

  return trimmed;
}

/**
 * Validates requested seats as an integer between 1 and MAX_SEATS_PER_BOOKING (10).
 * Rejects 0, negatives, decimals, numeric strings, and counts exceeding 10.
 */
export function parseSeats(val: unknown): number {
  if (typeof val !== 'number' || !Number.isInteger(val) || val <= 0) {
    throw new ValidationError('Seats must be a positive integer between 1 and 10.');
  }

  if (val > MAX_SEATS_PER_BOOKING) {
    throw new ValidationError('Cannot book more than 10 seats per booking.', {
      maxSeats: MAX_SEATS_PER_BOOKING
    });
  }

  return val;
}
