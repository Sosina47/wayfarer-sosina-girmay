import { prisma } from '../lib/prisma.js';
import {
  calculateRankingScore,
  comparePlacesTopRated,
  comparePlacesName,
  NEUTRAL_PRIOR_RATING,
  PlaceForRanking
} from '../lib/ranking.js';
import { SortOption } from '../lib/validation.js';

export interface ListPlacesOptions {
  category?: string;
  sort?: SortOption;
}

export class PlaceService {
  /**
   * Retrieves places with category filtering and Bayesian ranking, sorted deterministically.
   */
  async listPlaces(options: ListPlacesOptions = {}): Promise<PlaceForRanking[]> {
    const { category, sort = 'top-rated' } = options;

    // 1. Query global average rating across ALL reviews (independent of category filter)
    const globalAgg = await prisma.review.aggregate({
      _avg: { rating: true },
      _count: { id: true }
    });

    const globalAverage =
      globalAgg._count.id > 0 && globalAgg._avg.rating !== null
        ? globalAgg._avg.rating
        : NEUTRAL_PRIOR_RATING;

    // 2. Query review statistics grouped by place (avoids N+1 queries)
    const reviewStats = await prisma.review.groupBy({
      by: ['placeId'],
      _avg: { rating: true },
      _count: { id: true }
    });

    const statsMap = new Map<number, { count: number; avg: number }>();
    for (const stat of reviewStats) {
      if (stat._avg.rating !== null) {
        statsMap.set(stat.placeId, {
          count: stat._count.id,
          avg: stat._avg.rating
        });
      }
    }

    // 3. Fetch places matching category filter
    const places = await prisma.place.findMany({
      where: category ? { category } : undefined,
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        imageUrl: true
      }
    });

    // 4. Attach stats and calculate Bayesian weighted score
    const rankedPlaces: PlaceForRanking[] = places.map(place => {
      const stats = statsMap.get(place.id);
      const reviewCount = stats ? stats.count : 0;
      const rawAvg = stats ? stats.avg : null;
      const averageRating = rawAvg !== null ? Number(rawAvg.toFixed(2)) : null;

      const score = calculateRankingScore(reviewCount, rawAvg, globalAverage);

      return {
        id: place.id,
        name: place.name,
        category: place.category,
        description: place.description,
        imageUrl: place.imageUrl,
        reviewCount,
        averageRating,
        score
      };
    });

    // 5. Deterministic sorting in backend
    if (sort === 'name') {
      rankedPlaces.sort(comparePlacesName);
    } else {
      rankedPlaces.sort(comparePlacesTopRated);
    }

    return rankedPlaces;
  }

  /**
   * Retrieves all distinct category names in alphabetical order.
   */
  async listCategories(): Promise<string[]> {
    const results = await prisma.place.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });

    return results.map(r => r.category);
  }
}

export const placeService = new PlaceService();
