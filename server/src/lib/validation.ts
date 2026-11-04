import { ValidationError } from './errors.js';

export type SortOption = 'top-rated' | 'name';

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
