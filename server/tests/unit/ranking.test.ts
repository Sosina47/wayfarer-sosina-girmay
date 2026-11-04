import { describe, it, expect } from 'vitest';
import {
  calculateRankingScore,
  comparePlacesTopRated,
  comparePlacesName,
  NEUTRAL_PRIOR_RATING,
  PlaceForRanking
} from '../../src/lib/ranking.js';

describe('Bayesian Ranking Formula (Pure Functions)', () => {
  const globalMean = 4.0;
  const m = 10;

  it('fixes the headline bug: 1 review at 5.0 scores below 312 reviews at 4.7', () => {
    // A café with 1 review at 5.0
    const cafeScore = calculateRankingScore(1, 5.0, globalMean, m);
    // A museum with 312 reviews at 4.7
    const museumScore = calculateRankingScore(312, 4.7, globalMean, m);

    expect(cafeScore).toBeCloseTo(4.091, 3);
    expect(museumScore).toBeCloseTo(4.678, 3);
    expect(cafeScore).toBeLessThan(museumScore);
  });

  it('calculates the exact hand-computed value for v=1, R=5.0, C=4.0', () => {
    // (1/11)*5.0 + (10/11)*4.0 = 5/11 + 40/11 = 45/11 ≈ 4.090909...
    const score = calculateRankingScore(1, 5.0, globalMean, m);
    expect(score).toBeCloseTo(45 / 11, 5);
    expect(score).toBeCloseTo(4.091, 3);
  });

  it('evaluates a place with 0 reviews to exactly the global mean C', () => {
    const scoreWithNull = calculateRankingScore(0, null, globalMean, m);
    expect(scoreWithNull).toBe(4.0);

    const scoreWithZeroCount = calculateRankingScore(0, 0, globalMean, m);
    expect(scoreWithZeroCount).toBe(4.0);
  });

  it('uses the neutral prior 3.0 when there are no reviews anywhere in the database', () => {
    // When C is NEUTRAL_PRIOR_RATING (3.0), unreviewed place scores 3.0
    const score = calculateRankingScore(0, null, NEUTRAL_PRIOR_RATING, m);
    expect(score).toBe(3.0);
  });

  it('converges toward place average as review count grows large', () => {
    // With 10,000 reviews at 4.5, score should be virtually identical to 4.5
    const score = calculateRankingScore(10000, 4.5, globalMean, m);
    expect(score).toBeCloseTo(4.5, 2);
    expect(Math.abs(score - 4.5)).toBeLessThan(0.01);
  });

  it('exhibits directional shrinkage around the global mean C', () => {
    // Above C (4.0): more reviews pull score UP toward the high average
    const highFew = calculateRankingScore(2, 4.8, globalMean, m);
    const highMany = calculateRankingScore(20, 4.8, globalMean, m);
    expect(highMany).toBeGreaterThan(highFew);

    // Below C (4.0): more reviews pull score DOWN toward the low average
    const lowFew = calculateRankingScore(2, 2.5, globalMean, m);
    const lowMany = calculateRankingScore(20, 2.5, globalMean, m);
    expect(lowMany).toBeLessThan(lowFew);
  });

  it('strictly bounds output within [1.0, 5.0] for extreme inputs', () => {
    const maxExtreme = calculateRankingScore(1, 5.0, 5.0, m);
    expect(maxExtreme).toBeLessThanOrEqual(5.0);

    const minExtreme = calculateRankingScore(1, 1.0, 1.0, m);
    expect(minExtreme).toBeGreaterThanOrEqual(1.0);
  });

  describe('Sorting Comparators', () => {
    const makePlace = (
      id: number,
      name: string,
      score: number,
      reviewCount: number
    ): PlaceForRanking => ({
      id,
      name,
      category: 'History',
      description: 'Desc',
      imageUrl: null,
      averageRating: score,
      score,
      reviewCount
    });

    it('sorts top-rated primarily by score descending', () => {
      const p1 = makePlace(1, 'Lower Score', 4.1, 10);
      const p2 = makePlace(2, 'Higher Score', 4.5, 5);

      const list = [p1, p2].sort(comparePlacesTopRated);
      expect(list[0].name).toBe('Higher Score');
      expect(list[1].name).toBe('Lower Score');
    });

    it('breaks score ties by review count descending', () => {
      const p1 = makePlace(1, 'Fewer Reviews', 4.2, 3);
      const p2 = makePlace(2, 'More Reviews', 4.2, 15);

      const list = [p1, p2].sort(comparePlacesTopRated);
      expect(list[0].name).toBe('More Reviews');
      expect(list[1].name).toBe('Fewer Reviews');
    });

    it('breaks score and count ties alphabetically by name ascending', () => {
      const p1 = makePlace(1, 'Zeta Place', 4.0, 0);
      const p2 = makePlace(2, 'Alpha Place', 4.0, 0);

      const list = [p1, p2].sort(comparePlacesTopRated);
      expect(list[0].name).toBe('Alpha Place');
      expect(list[1].name).toBe('Zeta Place');
    });

    it('sorts alphabetically by name with comparePlacesName', () => {
      const p1 = makePlace(1, 'Belém Tower', 4.0, 3);
      const p2 = makePlace(2, 'Alfama', 4.5, 3);
      const p3 = makePlace(3, 'Castelo', 4.2, 1);

      const list = [p1, p2, p3].sort(comparePlacesName);
      expect(list.map(p => p.name)).toEqual(['Alfama', 'Belém Tower', 'Castelo']);
    });
  });
});
