/**
 * Pure Bayesian weighted-average ranking calculations and sorting comparators.
 *
 * Formula:
 *   score = (v / (v + m)) * R + (m / (v + m)) * C
 *
 * Where:
 *   v = place review count
 *   R = place average rating
 *   C = global mean rating across all reviews in the system
 *   m = prior weight constant (10)
 *
 * Free of any database or I/O imports for deterministic unit testability.
 */

export const PRIOR_WEIGHT = 10; // m
export const NEUTRAL_PRIOR_RATING = 3.0; // Fallback C when database has 0 reviews globally

export interface PlaceForRanking {
  id: number;
  name: string;
  category: string;
  description: string;
  imageUrl: string | null;
  reviewCount: number;
  averageRating: number | null;
  score: number;
}

/**
 * Calculates the Bayesian weighted score for a place.
 */
export function calculateRankingScore(
  reviewCount: number,
  averageRating: number | null,
  globalAverage: number,
  priorWeight = PRIOR_WEIGHT
): number {
  // If a place has no reviews, its score is entirely defined by the prior (global mean)
  if (reviewCount <= 0 || averageRating === null) {
    return globalAverage;
  }

  const weight = reviewCount / (reviewCount + priorWeight);
  const prior = priorWeight / (reviewCount + priorWeight);

  return weight * averageRating + prior * globalAverage;
}

/**
 * Deterministic comparator for 'top-rated' sorting:
 * 1. Score descending
 * 2. Review count descending (tie-breaker)
 * 3. Place name ascending (alphabetical tie-breaker)
 */
export function comparePlacesTopRated(a: PlaceForRanking, b: PlaceForRanking): number {
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  if (b.reviewCount !== a.reviewCount) {
    return b.reviewCount - a.reviewCount;
  }
  return a.name.localeCompare(b.name);
}

/**
 * Comparator for 'name' sorting:
 * Alphabetical order (A-Z) by place name.
 */
export function comparePlacesName(a: PlaceForRanking, b: PlaceForRanking): number {
  return a.name.localeCompare(b.name);
}
